"""OpenAQ v3 API Client & Spatio-Temporal Caching Dependency.

Responsibilities:
- Spatio-temporal caching (1.0 km / 30 minutes) to avoid redundant OpenAQ network requests.
- Communicate with external OpenAQ v3 API.
- Query candidate monitoring stations and select optimal station using core station selector.
- Fetch raw sensor readings for selected stations.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from dotenv import load_dotenv

from app.core import (
    OPENAQ_LOCATIONS_LIMIT,
    OPENAQ_SEARCH_RADIUS_METERS,
    POLLUTION_REFRESH_DISTANCE_M,
    POLLUTION_REFRESH_INTERVAL_SECONDS,
    haversine_distance,
    select_best_station_for_location,
)

load_dotenv()

OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "").strip()
OPENAQ_BASE_URL = "https://api.openaq.org/v3"

# Spatio-Temporal Cache Configuration (1.0 km / 30 minutes)
CACHE_TTL_SECONDS = POLLUTION_REFRESH_INTERVAL_SECONDS  # 1800s
CACHE_DISTANCE_METERS = POLLUTION_REFRESH_DISTANCE_M   # 1000m
MAX_CACHE_ENTRIES = 50

# In-memory spatial cache: [ { "latitude": float, "longitude": float, "timestamp": float, "iso": str, "display_time": str, "data": dict } ]
_SPATIO_TEMPORAL_CACHE: List[Dict[str, Any]] = []


def get_openaq_headers() -> Dict[str, str]:
    """Returns headers for OpenAQ v3 API requests."""
    api_key = (os.getenv("OPENAQ_API_KEY") or OPENAQ_API_KEY).strip()
    return {"X-API-Key": api_key} if api_key else {}


# =========================================================================
# Spatio-Temporal Cache Operations
# =========================================================================

def get_cached_observation(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Evaluates in-memory spatial cache for coordinates within 1km and 30 minutes."""
    now = time.time()
    for entry in reversed(_SPATIO_TEMPORAL_CACHE):
        age_seconds = now - entry["timestamp"]
        if age_seconds >= CACHE_TTL_SECONDS:
            continue

        distance_meters = haversine_distance(
            lat, lon, entry["latitude"], entry["longitude"]
        )
        if distance_meters <= CACHE_DISTANCE_METERS:
            cached_data = dict(entry["data"])
            cached_data["is_cached"] = True
            cached_data["cache_age_seconds"] = int(age_seconds)
            cached_data["cache_expires_in_seconds"] = max(0, int(CACHE_TTL_SECONDS - age_seconds))
            cached_data["cache_distance_meters"] = round(distance_meters, 1)
            cached_data["cache_anchor_lat"] = entry["latitude"]
            cached_data["cache_anchor_lon"] = entry["longitude"]
            cached_data["cached_at"] = entry["iso"]
            cached_data["cached_at_display"] = entry.get("display_time", "")

            data_quality = dict(cached_data.get("data_quality") or {})
            data_quality["is_cached"] = True
            cached_data["data_quality"] = data_quality
            return cached_data

    return None


def cache_observation(
    lat: float,
    lon: float,
    data: Dict[str, Any],
    timestamp: float,
    iso_str: str,
    display_time: str,
) -> None:
    """Stores a complete observation in the spatio-temporal cache."""
    _SPATIO_TEMPORAL_CACHE.append({
        "latitude": lat,
        "longitude": lon,
        "timestamp": timestamp,
        "iso": iso_str,
        "display_time": display_time,
        "data": data,
    })
    if len(_SPATIO_TEMPORAL_CACHE) > MAX_CACHE_ENTRIES:
        del _SPATIO_TEMPORAL_CACHE[:-MAX_CACHE_ENTRIES]


def clear_spatial_cache() -> None:
    """Clears all entries in the spatio-temporal cache."""
    _SPATIO_TEMPORAL_CACHE.clear()


# =========================================================================
# OpenAQ API Network Client
# =========================================================================

async def fetch_candidate_locations(
    lat: float,
    lon: float,
    radius: int = OPENAQ_SEARCH_RADIUS_METERS,
    limit: int = OPENAQ_LOCATIONS_LIMIT,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """Queries OpenAQ v3 /locations endpoint for candidate stations within radius."""
    headers = get_openaq_headers()
    if not headers:
        return []

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        should_close = True

    try:
        response = await client.get(
            f"{OPENAQ_BASE_URL}/locations",
            headers=headers,
            params={
                "coordinates": f"{lat},{lon}",
                "radius": radius,
                "limit": limit,
            },
        )
        response.raise_for_status()
        return response.json().get("results") or []
    except Exception as exc:
        print(f"[OpenAQ Client] Failed to fetch locations: {exc}")
        return []
    finally:
        if should_close:
            await client.aclose()


async def select_nearest_best_station(
    lat: float,
    lon: float,
    client: Optional[httpx.AsyncClient] = None,
) -> Optional[Dict[str, Any]]:
    """Fetches candidate locations and selects the single optimal station."""
    candidates = await fetch_candidate_locations(lat, lon, client=client)
    if not candidates:
        return None

    return select_best_station_for_location(lat, lon, candidates)


async def fetch_sensor_latest_measurement(
    sensor_id: int,
    client: Optional[httpx.AsyncClient] = None,
) -> Optional[Dict[str, Any]]:
    """Fetches the latest hourly observation record for a specific sensor ID."""
    headers = get_openaq_headers()
    if not headers or not sensor_id:
        return None

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=6.0)
        should_close = True

    try:
        response = await client.get(
            f"{OPENAQ_BASE_URL}/sensors/{sensor_id}/hours",
            headers=headers,
            params={"limit": 1},
        )
        response.raise_for_status()
        results = response.json().get("results") or []
        return results[0] if results else None
    except Exception:
        return None
    finally:
        if should_close:
            await client.aclose()
