"""Spatial-Temporal Air Quality Cache.

Caches complete air-quality observations (pollutants, AQI, station metadata, data quality)
within configurable geographic radius (1.0 km) and freshness window (30 minutes).
Independent from exposure calculation engine.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from app.core.haversine import haversine_distance
from app.core.constants import (
    CACHE_DISTANCE_METERS,
    CACHE_TTL_SECONDS,
    MAX_CACHE_ENTRIES,
)


class SpatialTemporalCache:
    """In-memory spatial-temporal observation cache."""

    def __init__(
        self,
        ttl_seconds: int = CACHE_TTL_SECONDS,
        distance_meters: float = CACHE_DISTANCE_METERS,
        max_entries: int = MAX_CACHE_ENTRIES,
    ):
        self.ttl_seconds = ttl_seconds
        self.distance_meters = distance_meters
        self.max_entries = max_entries
        self._entries: List[Dict[str, Any]] = []

    def get_observation(self, lat: float, lon: float, now: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Retrieves cached observation if within distance threshold and TTL window."""
        current_time = now if now is not None else time.time()

        for entry in reversed(self._entries):
            age_seconds = current_time - entry["timestamp"]
            if age_seconds >= self.ttl_seconds:
                continue

            dist_m = haversine_distance(lat, lon, entry["latitude"], entry["longitude"])
            if dist_m <= self.distance_meters:
                cached_data = dict(entry["data"])
                cached_data["is_cached"] = True
                cached_data["cache_age_seconds"] = int(age_seconds)
                cached_data["cache_expires_in_seconds"] = max(0, int(self.ttl_seconds - age_seconds))
                cached_data["cache_distance_meters"] = round(dist_m, 1)
                cached_data["cache_anchor_lat"] = entry["latitude"]
                cached_data["cache_anchor_lon"] = entry["longitude"]
                cached_data["cached_at"] = entry["iso"]
                cached_data["cached_at_display"] = entry.get("display_time", "")

                data_quality = dict(cached_data.get("data_quality") or {})
                data_quality["is_cached"] = True
                cached_data["data_quality"] = data_quality
                return cached_data

        return None

    def store_observation(
        self,
        lat: float,
        lon: float,
        data: Dict[str, Any],
        timestamp: Optional[float] = None,
        iso_str: Optional[str] = None,
        display_time: Optional[str] = None,
    ) -> None:
        """Stores a complete observation snapshot into cache."""
        cur_time = timestamp if timestamp is not None else time.time()
        self._entries.append({
            "latitude": lat,
            "longitude": lon,
            "timestamp": cur_time,
            "iso": iso_str or "",
            "display_time": display_time or "",
            "data": data,
        })
        if len(self._entries) > self.max_entries:
            del self._entries[:-self.max_entries]

    def get_latest_observation(self) -> Optional[Dict[str, Any]]:
        """Returns the most recent cached observation entry if not expired."""
        now = time.time()
        for entry in reversed(self._entries):
            age_seconds = now - entry["timestamp"]
            if age_seconds < self.ttl_seconds:
                cached_data = dict(entry["data"])
                cached_data["is_cached"] = True
                cached_data["cache_age_seconds"] = int(age_seconds)
                return cached_data
        return None

    def clear(self) -> None:
        """Clears all cached entries."""
        self._entries.clear()


# Global cache singleton
spatial_temporal_cache = SpatialTemporalCache()
