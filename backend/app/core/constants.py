"""Centralized constants for AirDose personal PM2.5 exposure tracking system.
Follows physical units and dimensionless multipliers cleanly.
"""

# Base breathing rate for an average adult in resting/light activity (m³/second)
BASE_BREATHING_RATE_M3_S: float = 0.0001

# Dimensionless breathing multiplier (1.0 = normal/resting, higher during exertion)
DEFAULT_BREATHING_FACTOR: float = 1.0

# Infiltration factor for indoor environments (dimensionless approximation)
DEFAULT_INDOOR_FACTOR: float = 0.5

# Infiltration factor for outdoor environments (dimensionless)
OUTDOOR_FACTOR: float = 1.0

# Distance threshold in meters to trigger an air quality pollution refresh
POLLUTION_REFRESH_DISTANCE_M: float = 1000.0  # 1 km

# Maximum time in seconds before air quality data must be refreshed
POLLUTION_REFRESH_INTERVAL_SECONDS: int = 1800  # 30 minutes

# Periodic checkpoint interval in seconds to persist exposure segments to SQLite
EXPOSURE_CHECKPOINT_INTERVAL_SECONDS: int = 300  # 5 minutes

# Default geofence radius for user saved places in meters
DEFAULT_PLACE_RADIUS_METERS: float = 50.0
MIN_PLACE_RADIUS_METERS: float = 50.0
MAX_PLACE_RADIUS_METERS: float = 500.0

# Boundary hysteresis buffer in meters to prevent rapid flapping near geofence edges
HYSTERESIS_BUFFER_METERS: float = 25.0

# Number of consecutive samples outside geofence required to trigger outdoor transition
HYSTERESIS_SAMPLE_THRESHOLD: int = 2

# OpenAQ API Location Search Constants
OPENAQ_SEARCH_RADIUS_METERS: int = 25000  # 25 km radius
OPENAQ_LOCATIONS_LIMIT: int = 10  # Maximum candidate stations to fetch

