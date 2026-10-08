"""Services package for AirDose.
Provides business logic engines, CRUD operations, geofencing, exposure calculations,
and pollution telemetry.
"""

from app.services.user_service import (
    UserService,
    get_user_by_email,
    get_user_by_id,
    create_user,
)
from app.services.location_service import (
    LocationService,
    location_service,
    create_user_location,
    get_user_locations,
    get_user_location_by_id,
    update_user_location,
    delete_user_location,
    haversine_distance,
)
from app.services.exposure_service import (
    ExposureService,
    exposure_service,
    insert_exposure_segment,
    get_exposure_segments_for_day,
    insert_location_sample,
    calculate_inhalation_rate,
)
from app.services.daily_exposure_service import (
    DailyExposureService,
    get_daily_exposure,
    upsert_daily_exposure,
    get_daily_exposure_history,
    get_location_contributions,
)
from app.services.air_quality_service import (
    AirQualityService,
    air_quality_service,
    insert_air_quality_sample,
)

__all__ = [
    "UserService",
    "get_user_by_email",
    "get_user_by_id",
    "create_user",
    "LocationService",
    "location_service",
    "create_user_location",
    "get_user_locations",
    "get_user_location_by_id",
    "update_user_location",
    "delete_user_location",
    "haversine_distance",
    "ExposureService",
    "exposure_service",
    "insert_exposure_segment",
    "get_exposure_segments_for_day",
    "insert_location_sample",
    "calculate_inhalation_rate",
    "DailyExposureService",
    "get_daily_exposure",
    "upsert_daily_exposure",
    "get_daily_exposure_history",
    "get_location_contributions",
    "AirQualityService",
    "air_quality_service",
    "insert_air_quality_sample",
]
