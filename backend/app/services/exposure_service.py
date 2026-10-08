"""Exposure Tracking Service for AirDose.

Coordinates personal PM2.5 exposure lifecycle:
- In-memory active tracking state per user.
- Integration over actual elapsed time (delta_t) using core exposure formulas.
- Dynamic segment transition rules (environment shift, exertion change, PM2.5 jump, checkpoint).
- Segment persistence to SQLite via repository and automated daily total aggregation.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.core.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    MIN_SEGMENT_DURATION_SECONDS,
    EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
)
from app.core.exposure import (
    calculate_inhalation_rate,
    calculate_exposure_increment,
    should_close_segment,
)
from app.repositories.exposure_repository import (
    ExposureRepository,
    insert_exposure_segment,
    get_exposure_segments_for_day,
    insert_location_sample,
)
from app.services.location_service import LocationService
from app.services.air_quality_service import air_quality_service
from app.services.daily_exposure_service import DailyExposureService


class ActiveSegment:
    """Represents an ongoing in-memory exposure tracking segment for a user."""

    def __init__(
        self,
        user_id: int,
        start_time: float,
        location_type: str,
        location_id: Optional[int],
        location_name: str,
        latitude: float,
        longitude: float,
        pm25: float,
        pm25_timestamp: str,
        pm25_source: str,
        pm25_confidence: str,
        infiltration_factor: float,
        breathing_factor: float,
        base_breathing_rate_m3_s: float = BASE_BREATHING_RATE_M3_S,
    ):
        self.user_id = user_id
        self.start_time = start_time
        self.last_updated_time = start_time
        self.location_type = location_type.upper()
        self.location_id = location_id
        self.location_name = location_name
        self.latitude = latitude
        self.longitude = longitude
        self.pm25 = max(0.0, float(pm25))
        self.pm25_timestamp = pm25_timestamp
        self.pm25_source = pm25_source
        self.pm25_confidence = pm25_confidence
        self.infiltration_factor = float(infiltration_factor)
        self.breathing_factor = float(breathing_factor)
        self.base_breathing_rate_m3_s = float(base_breathing_rate_m3_s)
        self.accumulated_exposure_ug = 0.0
        self.outside_sample_count = 0
        self.last_checkpoint_time = start_time

    @property
    def inhalation_rate_ug_s(self) -> float:
        return calculate_inhalation_rate(
            pm25=self.pm25,
            infiltration_factor=self.infiltration_factor,
            breathing_factor=self.breathing_factor,
            base_breathing_rate=self.base_breathing_rate_m3_s,
        )

    def update_accumulation(self, current_time: float) -> float:
        """Accurately calculates elapsed seconds from last_updated_time and integrates inhalation rate."""
        delta_t = max(0.0, current_time - self.last_updated_time)
        added_ug = calculate_exposure_increment(self.inhalation_rate_ug_s, delta_t)
        self.accumulated_exposure_ug += added_ug
        self.last_updated_time = current_time
        return self.accumulated_exposure_ug

    def to_dict(self, current_time: Optional[float] = None) -> Dict[str, Any]:
        cur_t = current_time if current_time is not None else time.time()
        preview_dt = max(0.0, cur_t - self.last_updated_time)
        preview_exp = self.accumulated_exposure_ug + calculate_exposure_increment(self.inhalation_rate_ug_s, preview_dt)
        elapsed_s = max(0.0, cur_t - self.start_time)

        return {
            "user_id": self.user_id,
            "start_time": datetime.fromtimestamp(self.start_time, tz=timezone.utc).isoformat(),
            "elapsed_seconds": round(elapsed_s, 1),
            "environment": self.location_type,
            "location_type": self.location_type,
            "location_id": self.location_id,
            "location_name": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "pm25": round(self.pm25, 2),
            "pm25_timestamp": self.pm25_timestamp,
            "pm25_source": self.pm25_source,
            "pm25_confidence": self.pm25_confidence,
            "infiltration_factor": round(self.infiltration_factor, 2),
            "breathing_factor": round(self.breathing_factor, 2),
            "base_breathing_rate_m3_s": self.base_breathing_rate_m3_s,
            "inhalation_rate_ug_s": round(self.inhalation_rate_ug_s, 6),
            "accumulated_exposure_ug": round(preview_exp, 4),
        }


class ExposureService:
    """Singleton service that manages real-time personal exposure segments."""

    def __init__(self):
        # Maps user_id -> ActiveSegment
        self._active_segments: Dict[int, ActiveSegment] = {}

    def close_and_persist_segment(
        self, user_id: int, current_time: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """Closes the current active segment, updates accumulated exposure, and persists to SQLite."""
        segment = self._active_segments.pop(user_id, None)
        if not segment:
            return None

        if current_time is None:
            current_time = time.time()

        segment.update_accumulation(current_time)

        # Do not persist negligible/empty segments
        if (current_time - segment.start_time) < MIN_SEGMENT_DURATION_SECONDS:
            return None

        start_iso = datetime.fromtimestamp(segment.start_time, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        end_iso = datetime.fromtimestamp(current_time, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        date_str = datetime.fromtimestamp(segment.start_time, tz=timezone.utc).strftime("%Y-%m-%d")

        try:
            persisted = ExposureRepository.insert_segment(
                user_id=segment.user_id,
                start_time=start_iso,
                end_time=end_iso,
                location_type=segment.location_type,
                location_id=segment.location_id,
                latitude=segment.latitude,
                longitude=segment.longitude,
                pm25=segment.pm25,
                pm25_timestamp=segment.pm25_timestamp,
                pm25_source=segment.pm25_source,
                pm25_confidence=segment.pm25_confidence,
                infiltration_factor=segment.infiltration_factor,
                breathing_factor=segment.breathing_factor,
                base_breathing_rate_m3_s=segment.base_breathing_rate_m3_s,
                inhalation_rate_ug_s=segment.inhalation_rate_ug_s,
                exposure_ug=segment.accumulated_exposure_ug,
            )

            # Canonical aggregation update
            DailyExposureService.recalculate_daily_total(user_id, date_str)
            return persisted
        except Exception as e:
            print(f"[ExposureService] Failed to persist segment: {e}")
            return None

    async def process_tracking_update(
        self,
        user_id: int,
        latitude: float,
        longitude: float,
        accuracy: Optional[float] = None,
        speed: Optional[float] = None,
        heading: Optional[float] = None,
        breathing_factor: float = DEFAULT_BREATHING_FACTOR,
        client_timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Processes a GPS checkpoint tick:
        1. Logs telemetry sample.
        2. Resolves environment with debouncing.
        3. Retrieves normalized PM2.5 from air quality service.
        4. Evaluates segment transition rules via core logic.
        5. Closes/checkpoints or continues active segment.
        """
        now = client_timestamp if client_timestamp is not None else time.time()

        try:
            ExposureRepository.insert_location_sample(
                user_id=user_id,
                latitude=latitude,
                longitude=longitude,
                accuracy_meters=accuracy,
                speed_mps=speed,
                heading=heading,
            )
        except Exception:
            pass

        active = self._active_segments.get(user_id)
        prev_place_id = active.location_id if active else None
        prev_outside_count = active.outside_sample_count if active else 0

        # 1. Resolve environment
        env_info, new_outside_count = LocationService.resolve_environment(
            user_id=user_id,
            lat=latitude,
            lon=longitude,
            accuracy=accuracy,
            previous_place_id=prev_place_id,
            outside_sample_count=prev_outside_count,
        )

        new_loc_type = env_info["environment"]
        new_loc_id = env_info["location_id"]
        new_loc_name = env_info["location_name"]
        new_infiltration = env_info["infiltration_factor"]

        # 2. Retrieve normalized PM2.5
        telemetry = await air_quality_service.get_air_quality_telemetry(latitude, longitude)
        pm25_info = telemetry.get("pollutants", {}).get("pm25", {})
        pm25_val = float(pm25_info.get("value") or 0.0)
        pm25_timestamp = telemetry.get("cached_at") or telemetry.get("fetched_at") or datetime.now(timezone.utc).isoformat()
        pm25_source = telemetry.get("source", "OpenAQ Global Clean Air Network")
        pm25_confidence = "high" if telemetry.get("status") == "success" else "medium"

        # 3. Evaluate segment closure using core rules
        should_start_new = False

        if active is None:
            should_start_new = True
        else:
            active.outside_sample_count = new_outside_count
            active.update_accumulation(now)

            close_needed, _ = should_close_segment(
                current_location_type=active.location_type,
                new_location_type=new_loc_type,
                current_location_id=active.location_id,
                new_location_id=new_loc_id,
                current_breathing_factor=active.breathing_factor,
                new_breathing_factor=breathing_factor,
                current_pm25=active.pm25,
                new_pm25=pm25_val,
                elapsed_since_checkpoint=now - active.last_checkpoint_time,
                checkpoint_interval_seconds=EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
            )
            should_start_new = close_needed

        if should_start_new:
            if active is not None:
                self.close_and_persist_segment(user_id, now)

            new_segment = ActiveSegment(
                user_id=user_id,
                start_time=now,
                location_type=new_loc_type,
                location_id=new_loc_id,
                location_name=new_loc_name,
                latitude=latitude,
                longitude=longitude,
                pm25=pm25_val,
                pm25_timestamp=pm25_timestamp,
                pm25_source=pm25_source,
                pm25_confidence=pm25_confidence,
                infiltration_factor=new_infiltration,
                breathing_factor=breathing_factor,
                base_breathing_rate_m3_s=BASE_BREATHING_RATE_M3_S,
            )
            new_segment.outside_sample_count = new_outside_count
            self._active_segments[user_id] = new_segment
            active = new_segment
        else:
            active.latitude = latitude
            active.longitude = longitude

        return active.to_dict(now)

    def stop_tracking(self, user_id: int) -> Dict[str, Any]:
        """Stops active tracking and persists final segment."""
        persisted = self.close_and_persist_segment(user_id)
        return {
            "tracking": False,
            "persisted_segment": persisted,
            "message": "Tracking stopped and segment persisted.",
        }

    def get_current_state(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Returns in-memory active tracking state if tracking is ongoing."""
        active = self._active_segments.get(user_id)
        if active:
            return active.to_dict(time.time())
        return None


# Global singleton instance for exposure tracking
exposure_service = ExposureService()
