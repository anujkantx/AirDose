"""FastAPI route dependencies package for AirDose."""

from app.dependencies.auth import get_current_user_id
from app.dependencies.openaq_api import (
    fetch_candidate_locations,
    select_nearest_best_station,
    fetch_sensor_latest_measurement,
    get_cached_observation,
    cache_observation,
    clear_spatial_cache,
)

__all__ = [
    "get_current_user_id",
    "fetch_candidate_locations",
    "select_nearest_best_station",
    "fetch_sensor_latest_measurement",
    "get_cached_observation",
    "cache_observation",
    "clear_spatial_cache",
]
