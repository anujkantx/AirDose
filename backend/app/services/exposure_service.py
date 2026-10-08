"""Exposure Tracking Service for AirDose.
Implements the core calculation:
Inhalation Rate = PM2.5 × Infiltration Factor × Breathing Factor × Base Breathing Rate
Manages exposure segments, accumulation by actual elapsed time,
boundary debouncing, periodic checkpoints, and persistence to SQLite.
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.core.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
)
from app.db.connection import get_db
from app.services.location_service import LocationService
from app.services.air_quality_service import air_quality_service
from app.services.daily_exposure_service import DailyExposureService


# ------------------- CRUD Operations for Segments & Telemetry -------------------

def insert_exposure_segment(
    user_id: int,
    start_time: str,
    end_time: str,
    location_type: str,
    location_id: Optional[int],
    latitude: Optional[float],
    longitude: Optional[float],
    pm25: float,
    pm25_timestamp: Optional[str],
    pm25_source: Optional[str],
    pm25_confidence: Optional[str],
    infiltration_factor: float,
    breathing_factor: float,
    base_breathing_rate_m3_s: float,
    inhalation_rate_ug_s: float,
    exposure_ug: float,
) -> Dict[str, Any]:
    """Persists a closed exposure segment into SQLite."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO exposure_segments (
                user_id, start_time, end_time, location_type, location_id,
                latitude, longitude, pm25, pm25_timestamp, pm25_source, pm25_confidence,
                infiltration_factor, breathing_factor, base_breathing_rate_m3_s,
                inhalation_rate_ug_s, exposure_ug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, start_time, end_time, location_type.upper(), location_id,
                latitude, longitude, float(pm25), pm25_timestamp, pm25_source, pm25_confidence,
                float(infiltration_factor), float(breathing_factor), float(base_breathing_rate_m3_s),
                float(inhalation_rate_ug_s), float(exposure_ug)
            )
        )
        seg_id = cursor.lastrowid
        cursor.execute("SELECT * FROM exposure_segments WHERE id = ?", (seg_id,))
        return dict(cursor.fetchone())


def get_exposure_segments_for_day(user_id: int, date_str: str) -> List[Dict[str, Any]]:
    """Retrieves all exposure segments for a specific user and date (YYYY-MM-DD)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT * FROM exposure_segments
               WHERE user_id = ? AND DATE(start_time) = ?
               ORDER BY start_time ASC""",
            (user_id, date_str)
        )
        return [dict(row) for row in cursor.fetchall()]


def insert_location_sample(
    user_id: int,
    latitude: float,
    longitude: float,
    accuracy_meters: Optional[float] = None,
    speed_mps: Optional[float] = None,
    heading: Optional[float] = None,
) -> None:
    """Stores a raw location telemetry sample."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO location_samples (user_id, latitude, longitude, accuracy_meters, speed_mps, heading)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, latitude, longitude, accuracy_meters, speed_mps, heading)
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
        self.accumulated_exposure_ug = 0.0
        self.outside_sample_count = 0
        self.last_checkpoint_time = start_time

    @property
    def inhalation_rate_ug_s(self) -> float:
        return calculate_inhalation_rate(
            pm25=self.pm25,
            infiltration_factor=self.infiltration_factor,
            breathing_factor=self.breathing_factor,
            base_breathing_rate_m3_s=self.base_breathing_rate_m3_s,
        )

    def update_accumulation(self, current_time: float) -> float:
        """Accurately calculates elapsed seconds from last_updated_time and integrates inhalation rate."""
        delta_t = max(0.0, current_time - self.last_updated_time)
        added_ug = self.inhalation_rate_ug_s * delta_t
        self.accumulated_exposure_ug += added_ug
        self.last_updated_time = current_time
        return self.accumulated_exposure_ug

    def to_dict(self, current_time: Optional[float] = None) -> Dict[str, Any]:
        cur_t = current_time or time.time()
        # Preview real-time total without modifying base update state
        preview_dt = max(0.0, cur_t - self.last_updated_time)
        preview_exp = self.accumulated_exposure_ug + (self.inhalation_rate_ug_s * preview_dt)
        elapsed_s = max(0.0, cur_t - self.start_time)

        return {
            "user_id": self.user_id,
            "start_time": datetime.fromtimestamp(self.start_time, tz=timezone.utc).isoformat(),
            "elapsed_seconds": round(elapsed_s, 1),
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
            "inhalation_rate_ug_s": round(self.inhalation_rate_ug_s, 6),
            "accumulated_exposure_ug": round(preview_exp, 4),
        }


class ExposureService:
    """Singleton service that manages multi-user real-time exposure segments in memory and SQLite."""

    def __init__(self):
        # Maps user_id -> ActiveSegment
        self._active_segments: Dict[int, ActiveSegment] = {}

    def close_and_persist_segment(
        self, user_id: int, current_time: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """Closes the current active segment, updates accumulated ug, and persists to SQLite."""
        segment = self._active_segments.pop(user_id, None)
        if not segment:
            return None

        if current_time is None:
            current_time = time.time()

        segment.update_accumulation(current_time)

        # Do not persist zero-duration or negligible segments (< 1.0 second)
        if (current_time - segment.start_time) < 1.0:
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
