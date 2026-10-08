"""Air Quality Service for AirDose.
Provides a clean, decoupled interface for full multi-pollutant telemetry observations
and spatio-temporal caching (1 km / 30 minutes).
"""

from typing import Dict, Any
from app.dependencies.openaq_api import fetch_openaq_air_quality


class AirQualityService:
    """Service to fetch spatio-temporally cached air quality telemetry."""

    async def get_air_quality_telemetry(
        self, lat: float, lon: float, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Fetches complete air quality telemetry using the 1km / 30-minute spatio-temporal cache."""
        return await fetch_openaq_air_quality(lat=lat, lon=lon, force_refresh=force_refresh)


# Global singleton instance for air quality service
air_quality_service = AirQualityService()
