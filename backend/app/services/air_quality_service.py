"""Air Quality Service for AirDose.
Provides a clean, decoupled interface for full multi-pollutant telemetry observations,
spatio-temporal caching (1 km / 30 minutes), and sample logging.
"""

from typing import Dict, Any, Optional
from app.db.connection import get_db
from app.dependencies.openaq_api import fetch_openaq_air_quality


def insert_air_quality_sample(
    latitude: float,
    longitude: float,
    pm25: float,
    source: str = "OpenAQ",
    confidence: str = "medium"
) -> None:
    """Stores an air quality observation sample in SQLite."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO air_quality_samples (latitude, longitude, pm25, source, confidence)
               VALUES (?, ?, ?, ?, ?)""",
            (latitude, longitude, pm25, source, confidence)
        )


class AirQualityService:
    """Service to fetch and log spatio-temporally cached air quality telemetry."""

    async def get_air_quality_telemetry(
        self, lat: float, lon: float, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Fetches complete air quality telemetry using the 1km / 30-minute spatio-temporal cache."""
        data = await fetch_openaq_air_quality(lat=lat, lon=lon, force_refresh=force_refresh)
        
        # Log sample to database if it's a fresh fetch
        if not data.get("is_cached", False):
            try:
                pm25_val = data.get("pollutants", {}).get("pm25", {}).get("value", 75.0)
                insert_air_quality_sample(
                    latitude=lat,
                    longitude=lon,
                    pm25=pm25_val if pm25_val is not None else 75.0,
                    source=data.get("source", "OpenAQ Global Clean Air Network"),
                    confidence="high" if data.get("status") == "success" else "medium",
                )
            except Exception as e:
                print(f"[AirQualityService] Warning: Could not log sample: {e}")

        return data


# Global singleton instance for air quality service
air_quality_service = AirQualityService()
