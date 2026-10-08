"""Application services package."""

from app.services.air_quality_service import AirQualityService, air_quality_service
from app.services.daily_exposure_service import DailyExposureService
from app.services.exposure_service import (
    ExposureService,
    ActiveSegment,
    exposure_service,
)
from app.services.location_service import (
    LocationService,
    create_user_location,
    get_user_locations,
    get_user_location_by_id,
    update_user_location,
    delete_user_location,
    location_service,
)
from app.services.user_service import (
    UserService,
    get_user_by_email,
    get_user_by_id,
    create_user,
)

__all__ = [
    "AirQualityService",
    "air_quality_service",
    "DailyExposureService",
    "ExposureService",
    "ActiveSegment",
    "exposure_service",
    "LocationService",
    "create_user_location",
    "get_user_locations",
    "get_user_location_by_id",
    "update_user_location",
    "delete_user_location",
    "location_service",
    "UserService",
    "get_user_by_email",
    "get_user_by_id",
    "create_user",
]
