"""Air Quality API Router.

HTTP Presentation endpoint for querying normalized OpenAQ telemetry for any coordinates.
"""

from fastapi import APIRouter, HTTPException, Query, status
from app.services.air_quality_service import air_quality_service

router = APIRouter(
    prefix="/api/air-quality",
    tags=["Air Quality Telemetry"],
)


@router.get("")
async def get_air_quality(
    lat: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude coordinate (mandatory)",
    ),
    lon: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude coordinate (mandatory)",
    ),
    force_refresh: bool = Query(
        False,
        description="Bypass spatio-temporal cache",
    ),
):
    """Fetches normalized air quality telemetry with EPA AQI calculations and spatio-temporal caching."""
    try:
        return await air_quality_service.get_air_quality_telemetry(
            lat=lat,
            lon=lon,
            force_refresh=force_refresh,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch OpenAQ air quality telemetry: {str(e)}",
        )