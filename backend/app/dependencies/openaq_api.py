"""Backward compatibility bridge for openaq_api.

Delegates to app.integrations.openaq and app.integrations.cache.
"""

from app.integrations.openaq.client import openaq_client
from app.integrations.cache.spatial_cache import spatial_temporal_cache
from app.core.station_selector import select_best_station_for_location

get_openaq_headers = openaq_client.get_headers
fetch_candidate_locations = openaq_client.fetch_candidate_locations
fetch_sensor_latest_measurement = openaq_client.fetch_sensor_latest_measurement

get_cached_observation = spatial_temporal_cache.get_observation
cache_observation = spatial_temporal_cache.store_observation
clear_spatial_cache = spatial_temporal_cache.clear


async def select_nearest_best_station(lat: float, lon: float, client=None):
    candidates = await openaq_client.fetch_candidate_locations(lat, lon, client=client)
    if not candidates:
        return None
    return select_best_station_for_location(lat, lon, candidates)
