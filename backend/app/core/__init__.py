"""Core scientific calculation engines, physical models, and domain constants."""

from app.core.infiltration import calculate_infiltration_factor
from app.core.aqi import (
    calculate_aqi,
    calculate_pm25_aqi,
    calculate_pm10_aqi,
    calculate_no2_aqi,
    calculate_o3_aqi,
    calculate_co_aqi,
    calculate_so2_aqi,
)
from app.core.haversine import haversine_distance
from app.core.station_selector import select_best_station_for_location, score_station
from app.core.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    POLLUTION_REFRESH_DISTANCE_M,
    POLLUTION_REFRESH_INTERVAL_SECONDS,
    EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
    DEFAULT_PLACE_RADIUS_METERS,
    MIN_PLACE_RADIUS_METERS,
    MAX_PLACE_RADIUS_METERS,
    HYSTERESIS_BUFFER_METERS,
    HYSTERESIS_SAMPLE_THRESHOLD,
    OPENAQ_SEARCH_RADIUS_METERS,
    OPENAQ_LOCATIONS_LIMIT,
)

__all__ = [
    "calculate_infiltration_factor",
    "calculate_aqi",
    "calculate_pm25_aqi",
    "calculate_pm10_aqi",
    "calculate_no2_aqi",
    "calculate_o3_aqi",
    "calculate_co_aqi",
    "calculate_so2_aqi",
    "haversine_distance",
    "select_best_station_for_location",
    "score_station",
    "BASE_BREATHING_RATE_M3_S",
    "DEFAULT_BREATHING_FACTOR",
    "DEFAULT_INDOOR_FACTOR",
    "OUTDOOR_FACTOR",
    "POLLUTION_REFRESH_DISTANCE_M",
    "POLLUTION_REFRESH_INTERVAL_SECONDS",
    "EXPOSURE_CHECKPOINT_INTERVAL_SECONDS",
    "DEFAULT_PLACE_RADIUS_METERS",
    "MIN_PLACE_RADIUS_METERS",
    "MAX_PLACE_RADIUS_METERS",
    "HYSTERESIS_BUFFER_METERS",
    "HYSTERESIS_SAMPLE_THRESHOLD",
    "OPENAQ_SEARCH_RADIUS_METERS",
    "OPENAQ_LOCATIONS_LIMIT",
]
