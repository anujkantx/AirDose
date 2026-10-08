"""Air Quality Telemetry router integrating with OpenAQ API."""

from fastapi import APIRouter, HTTPException, status, Query
from app.openaq_service import fetch_openaq_air_quality

router = APIRouter(prefix="/api/air-quality", tags=["Air Quality Telemetry"])


@router.get("")
async def get_air_quality(
    lat: float = Query(28.6139, description="Latitude coordinate"),
    lon: float = Query(77.2090, description="Longitude coordinate"),
):
    """Fetches real-time air quality metrics, pollutants, and AQI from OpenAQ."""
    try:
        data = await fetch_openaq_air_quality(lat=lat, lon=lon)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch OpenAQ air quality telemetry: {str(e)}",
        )
