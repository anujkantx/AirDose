"""Exposure Segments & Location Telemetry Database Repository.

Pure data access layer executing SQLite queries for exposure segments and location samples.
Zero HTTP or business logic.
"""

from typing import Dict, Any, Optional, List
from app.db.connection import get_db


class ExposureRepository:
    """Repository for exposure segments and GPS location samples."""

    @staticmethod
    def insert_segment(
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
        """Persists a closed exposure segment record to SQLite."""
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
                    user_id,
                    start_time,
                    end_time,
                    location_type.upper(),
                    location_id,
                    latitude,
                    longitude,
                    float(pm25),
                    pm25_timestamp,
                    pm25_source,
                    pm25_confidence,
                    float(infiltration_factor),
                    float(breathing_factor),
                    float(base_breathing_rate_m3_s),
                    float(inhalation_rate_ug_s),
                    float(exposure_ug),
                ),
            )
            seg_id = cursor.lastrowid
            cursor.execute("SELECT * FROM exposure_segments WHERE id = ?", (seg_id,))
            return dict(cursor.fetchone())

    @staticmethod
    def get_segments_by_user_and_date(user_id: int, date_str: str) -> List[Dict[str, Any]]:
        """Retrieves all exposure segments for a user on a given date (YYYY-MM-DD)."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT * FROM exposure_segments
                   WHERE user_id = ? AND DATE(start_time) = ?
                   ORDER BY start_time ASC""",
                (user_id, date_str),
            )
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_location_contributions(user_id: int, date_str: str) -> Dict[str, float]:
        """Sums exposure_ug grouped by location_type for a user on a given date."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT location_type, SUM(exposure_ug) AS total_exposure
                   FROM exposure_segments
                   WHERE user_id = ? AND DATE(start_time) = ?
                   GROUP BY location_type""",
                (user_id, date_str),
            )
            rows = cursor.fetchall()
            return {row["location_type"]: round(float(row["total_exposure"]), 4) for row in rows}

    @staticmethod
    def insert_location_sample(
        user_id: int,
        latitude: float,
        longitude: float,
        accuracy_meters: Optional[float] = None,
        speed_mps: Optional[float] = None,
        heading: Optional[float] = None,
    ) -> None:
        """Stores a raw GPS location telemetry sample."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO location_samples (user_id, latitude, longitude, accuracy_meters, speed_mps, heading)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (user_id, latitude, longitude, accuracy_meters, speed_mps, heading),
            )


# Functional aliases
insert_exposure_segment = ExposureRepository.insert_segment
get_exposure_segments_for_day = ExposureRepository.get_segments_by_user_and_date
get_location_contributions = ExposureRepository.get_location_contributions
insert_location_sample = ExposureRepository.insert_location_sample
