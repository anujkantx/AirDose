"""Centralized constants for AirDose personal PM2.5 exposure tracking system.

All physical units, dimensionless factors, algorithmic weights, and thresholds
are defined here to ensure formula replaceability and eliminate magic numbers.
"""

# =============================================================================
# 1. Human Physiology & Breathing Constants
# =============================================================================

# Base volumetric breathing rate for an average adult at rest/light activity (m³/second)
# Standard medical reference: ~6-8 liters/minute = ~0.00010 - 0.00013 m³/s.
BASE_BREATHING_RATE_M3_S: float = 0.0001

# Dimensionless breathing intensity multiplier (1.0 = resting/sedentary, 2.0 = light exercise, 3.5 = running)
DEFAULT_BREATHING_FACTOR: float = 1.0

# Minimum threshold difference to treat a breathing factor update as a segment-breaking change
BREATHING_FACTOR_CHANGE_THRESHOLD: float = 0.05


# =============================================================================
# 2. Micro-Environment Infiltration Constants
# =============================================================================

# Default indoor infiltration factor (dimensionless, ratio of indoor PM2.5 to outdoor PM2.5)
# In standard sealed residential buildings without dedicated filtration, ~0.50 (50% penetration).
DEFAULT_INDOOR_FACTOR: float = 0.50

# Outdoor infiltration factor (dimensionless, 1.0 = 100% ambient exposure)
OUTDOOR_FACTOR: float = 1.00

# Range limits for calculated infiltration factors
MIN_INFILTRATION_FACTOR: float = 0.10
MAX_INFILTRATION_FACTOR: float = 1.00


# =============================================================================
# 3. Geofencing & Location Hysteresis Constants
# =============================================================================

# Default geofence radius for user saved places in meters
DEFAULT_PLACE_RADIUS_METERS: float = 50.0

# Minimum and maximum permissible geofence radius in meters
MIN_PLACE_RADIUS_METERS: float = 50.0
MAX_PLACE_RADIUS_METERS: float = 500.0

# Boundary hysteresis buffer in meters to prevent rapid flapping near geofence edges
HYSTERESIS_BUFFER_METERS: float = 25.0

# Number of consecutive GPS samples outside geofence required before confirming transition to OUTDOOR
HYSTERESIS_SAMPLE_THRESHOLD: int = 2


# =============================================================================
# 4. Spatio-Temporal Air Quality Cache Constants
# =============================================================================

# Maximum spatial distance in meters within which a cached air quality observation is valid
CACHE_DISTANCE_METERS: float = 1000.0  # 1.0 km

# Maximum time in seconds before a cached air quality observation expires
CACHE_TTL_SECONDS: int = 1800  # 30 minutes

# Alias for backward compatibility
POLLUTION_REFRESH_DISTANCE_M: float = CACHE_DISTANCE_METERS
POLLUTION_REFRESH_INTERVAL_SECONDS: int = CACHE_TTL_SECONDS

# Maximum number of entries kept in the in-memory spatial cache
MAX_CACHE_ENTRIES: int = 50


# =============================================================================
# 5. Exposure Tracking & Segment Lifecycle Constants
# =============================================================================

# Periodic checkpoint interval in seconds to commit active exposure progress to SQLite
EXPOSURE_CHECKPOINT_INTERVAL_SECONDS: int = 300  # 5 minutes

# Absolute PM2.5 change threshold (µg/m³) to trigger a new exposure segment
PM25_CHANGE_ABS_THRESHOLD: float = 10.0

# Relative PM2.5 change threshold (fraction, e.g., 0.15 = 15%) to trigger a new exposure segment
PM25_CHANGE_REL_THRESHOLD: float = 0.15

# Minimum elapsed duration in seconds required to persist an exposure segment (filters out micro-ticks)
MIN_SEGMENT_DURATION_SECONDS: float = 1.0


# =============================================================================
# 6. Station Selection Algorithm Weights (Total = 1.0)
# =============================================================================

WEIGHT_DISTANCE: float = 0.45
WEIGHT_FRESHNESS: float = 0.35
WEIGHT_SENSORS: float = 0.15
WEIGHT_QUALITY: float = 0.05

# PM2.5 importance multiplier: candidate station score penalty if PM2.5 sensor is missing
STATION_PM25_MISSING_PENALTY: float = 0.60

# Distance exponential decay constant in kilometers
DISTANCE_DECAY_HALF_LIFE_KM: float = 10.0

# Freshness exponential decay constant in hours
FRESHNESS_DECAY_HALF_LIFE_HOURS: float = 6.0


# =============================================================================
# 7. OpenAQ API Integration Constants
# =============================================================================

OPENAQ_BASE_URL: str = "https://api.openaq.org/v3"
OPENAQ_SEARCH_RADIUS_METERS: int = 25000  # 25 km
OPENAQ_LOCATIONS_LIMIT: int = 10
OPENAQ_HTTP_TIMEOUT_SECONDS: float = 10.0
OPENAQ_SENSOR_TIMEOUT_SECONDS: float = 6.0
