"""Exposure Tracking Service for AirDose.
Implements the core calculation:
Inhalation Rate = PM2.5 × Infiltration Factor × Breathing Factor × Base Breathing Rate
Manages exposure segments, accumulation by actual elapsed time,
boundary debouncing, periodic checkpoints, and persistence to SQLite.
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
)
from app.services.location_service import LocationService
from app.services.air_quality_service import air_quality_service
from app.services.daily_exposure_service import DailyExposureService
from app.database import (
    insert_exposure_segment,
    insert_location_sample,
)


def calculate_inhalation_rate(
    pm25: float,
    infiltration_factor: float,
    breathing_factor: float = DEFAULT_BREATHING_FACTOR,
    base_breathing_rate_m3_s: float = BASE_BREATHING_RATE_M3_S,
) -> float:
    """Calculates instantaneous inhalation rate in micrograms per second (ug/s).
    Formula: PM2.5 (ug/m3) * infiltration * breathing_factor * base_breathing_rate (m3/s)
    """
    return float(pm25 * infiltration_factor * breathing_factor * base_breathing_rate_m3_s)


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
        self.pm25 = pm25
        self.pm25_timestamp = pm25_timestamp
        self.pm25_source = pm25_source
        self.pm25_confidence = pm25_confidence
        self.infiltration_factor = infiltration_factor
        self.breathing_factor = breathing_factor
        self.base_breathing_rate_m3_s = base_breathing_rate_m3_s

        self.inhalation_rate_ug_s = calculate_inhalation_rate(
            pm25, infiltration_factor, breathing_factor, base_breathing_rate_m3_s
        )
        self.accumulated_exposure_ug = 0.0
        self.last_checkpoint_time = start_time
        self.outside_sample_count = 0

    def update_accumulation(self, now: float) -> float:
        """Accumulates exposure based on actual elapsed time since last update."""
        if now <= self.last_updated_time:
            return self.accumulated_exposure_ug

        elapsed_seconds = now - self.last_updated_time
        incremental_ug = self.inhalation_rate_ug_s * elapsed_seconds
        self.accumulated_exposure_ug += incremental_ug
        self.last_updated_time = now
        return self.accumulated_exposure_ug

    def to_dict(self, now: Optional[float] = None) -> Dict[str, Any]:
        """Serializes current active tracking state."""
        current_time = now or time.time()
        self.update_accumulation(current_time)

        # Format ISO timestamps
        start_dt = datetime.fromtimestamp(self.start_time, tz=timezone.utc).isoformat()
        last_dt = datetime.fromtimestamp(self.last_updated_time, tz=timezone.utc).isoformat()

        return {
            "user_id": self.user_id,
            "segment_started_at": start_dt,
            "last_updated_at": last_dt,
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
            "accumulated_exposure_ug": round(self.accumulated_exposure_ug, 4),
            "tracking": True,
        }


class ExposureService:
    """Main exposure tracking engine."""

    def __init__(self):
        # In-memory dictionary of active segments keyed by user_id
        self._active_segments: Dict[int, ActiveSegment] = {}

    def get_active_segment(self, user_id: int) -> Optional[ActiveSegment]:
        return self._active_segments.get(user_id)

    def close_and_persist_segment(self, user_id: int, now: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Closes the user's active segment, writes to exposure_segments,
        and transactionally synchronizes daily_exposure total.
        """
        segment = self._active_segments.pop(user_id, None)
        if not segment:
            return None

        current_time = now or time.time()
        segment.update_accumulation(current_time)

        # Only persist segments that have meaningful duration (> 1 second)
        duration_s = current_time - segment.start_time
        if duration_s < 1.0 or segment.accumulated_exposure_ug <= 0.0:
            return None

        start_iso = datetime.fromtimestamp(segment.start_time, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        end_iso = datetime.fromtimestamp(current_time, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        date_str = datetime.fromtimestamp(segment.start_time, tz=timezone.utc).strftime("%Y-%m-%d")

        try:
            persisted = insert_exposure_segment(
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

            # Update daily exposure total from segments
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
        """Main lifecycle update:
        1. Resolve current environment with hysteresis.
        2. Retrieve current PM2.5 (with 1km/30min refresh logic).
        3. Evaluate active segment: continue, checkpoint, or close & start new segment.
        """
        now = client_timestamp or time.time()

        # Optional sample logging
        try:
            insert_location_sample(
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

        # 1. Resolve environment with debouncing / hysteresis
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

        # 2. Get PM2.5 concentration
        pollution = await air_quality_service.get_current_pm25(latitude, longitude)
        pm25_val = pollution["pm25"]

        # 3. Determine whether to start new segment
        should_start_new = False

        if active is None:
            should_start_new = True
        else:
            active.outside_sample_count = new_outside_count
            active.update_accumulation(now)

            # Condition A: Environment changed
            if active.location_type != new_loc_type or active.location_id != new_loc_id:
                should_start_new = True
            # Condition B: Breathing factor changed
            elif abs(active.breathing_factor - breathing_factor) > 0.01:
                should_start_new = True
            # Condition C: PM2.5 changed significantly (> 15% or > 10 ug/m3)
            elif abs(active.pm25 - pm25_val) >= 10.0 or (active.pm25 > 0 and abs(active.pm25 - pm25_val) / active.pm25 > 0.15):
                should_start_new = True
            # Condition D: Periodic checkpoint (every 5 minutes)
            elif (now - active.last_checkpoint_time) >= EXPOSURE_CHECKPOINT_INTERVAL_SECONDS:
                # Close segment to persist progress against browser crashes, and start contiguous segment
                should_start_new = True

        if should_start_new:
            if active is not None:
                self.close_and_persist_segment(user_id, now)

            # Start new segment
            new_segment = ActiveSegment(
                user_id=user_id,
                start_time=now,
                location_type=new_loc_type,
                location_id=new_loc_id,
                location_name=new_loc_name,
                latitude=latitude,
                longitude=longitude,
                pm25=pm25_val,
                pm25_timestamp=pollution["timestamp"],
                pm25_source=pollution["source"],
                pm25_confidence=pollution["confidence"],
                infiltration_factor=new_infiltration,
                breathing_factor=breathing_factor,
                base_breathing_rate_m3_s=BASE_BREATHING_RATE_M3_S,
            )
            new_segment.outside_sample_count = new_outside_count
            self._active_segments[user_id] = new_segment
            active = new_segment
        else:
            # Update coordinate and latest time on active segment
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
        """Returns the in-memory active tracking state if tracking is on."""
        active = self._active_segments.get(user_id)
        if active:
            return active.to_dict(time.time())
        return None


# Global singleton instance for exposure tracking
exposure_service = ExposureService()
