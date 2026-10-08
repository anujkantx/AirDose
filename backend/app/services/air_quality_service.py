"""Air Quality Service for AirDose.
Provides a clean, decoupled interface for PM2.5 observations,
caching, and movement/time-based refresh logic (1 km / 30 minutes).
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.constants import (
    POLLUTION_REFRESH_DISTANCE_M,
    POLLUTION_REFRESH_INTERVAL_SECONDS,
)
from app.openaq_service import fetch_openaq_air_quality
from app.database import insert_air_quality_sample


class AirQualityService:
    """Manages PM2.5 readings, smart caching, and refresh criteria."""

    def __init__(self):
        self._last_pm25_reading: Optional[Dict[str, Any]] = None

    async def get_air_quality_telemetry(
        self, lat: float, lon: float, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Fetches complete air quality telemetry using the 1km / 30-minute spatio-temporal cache."""
        data = await fetch_openaq_air_quality(lat=lat, lon=lon, force_refresh=force_refresh)
        
        # Log sample if it's a fresh fetch
        if not data.get("is_cached", False):
            try:
                pm25_val = data.get("pollutants", {}).get("pm25", {}).get("value", 75.0)
                insert_air_quality_sample(
                    latitude=lat,
                    longitude=lon,
                    pm25=pm25_val,
                    source=data.get("source", "OpenAQ Global Clean Air Network"),
                    confidence="high" if data.get("status") == "success" else "medium",
                )
            except Exception as e:
                print(f"[AirQualityService] Warning: Could not log sample: {e}")

        return data

    async def get_current_pm25(
        self, lat: float, lon: float, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Returns the current PM2.5 concentration for the given coordinates.
        Uses cached values unless 1km moved, 30m elapsed, or force_refresh is True.
        """
        raw_data = await self.get_air_quality_telemetry(lat, lon, force_refresh=force_refresh)
        pm25_info = raw_data.get("pollutants", {}).get("pm25", {})
        pm25_value = pm25_info.get("value")
        if pm25_value is None or pm25_value < 0:
            pm25_value = 75.0  # Safe reasonable fallback

        timestamp_iso = raw_data.get("fetched_at", datetime.now(timezone.utc).isoformat())
        display_time = raw_data.get("fetched_at_display", datetime.now().strftime("%I:%M %p"))
        source_name = raw_data.get("source", "OpenAQ Global Clean Air Network")

        reading = {
            "pm25": float(round(pm25_value, 2)),
            "timestamp": timestamp_iso,
            "display_time": display_time,
            "source": source_name,
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "confidence": "high" if raw_data.get("status") == "success" else "medium",
            "is_cached": raw_data.get("is_cached", False),
            "cache_age_seconds": raw_data.get("cache_age_seconds", 0),
            "cache_expires_in_seconds": raw_data.get("cache_expires_in_seconds", 1800),
            "cache_distance_meters": raw_data.get("cache_distance_meters", 0.0),
            "cached_at": raw_data.get("cached_at", timestamp_iso),
            "cached_at_display": raw_data.get("cached_at_display", display_time),
        }

        self._last_pm25_reading = reading
        return reading

    def get_cached_pm25(self) -> Optional[Dict[str, Any]]:
        """Returns cached PM2.5 with freshness age if available."""
        if not self._last_pm25_reading:
            return None
        return dict(self._last_pm25_reading)


# Global singleton instance for service-wide pollution state
air_quality_service = AirQualityService()

