"""Air Quality Service for AirDose.

Responsibilities:
- Coordinates spatial caching, OpenAQ client communication, station selection, and sensor reading fetches.
- Normalizes pollutant parameters and units.
- Calculates AQI and sub-indices via core calculation engine.
- Assembles normalized air quality telemetry responses for API routes and exposure tracking.
- Clearly flags data source quality (LIVE, CACHED, STALE, FALLBACK, DEMO, UNAVAILABLE).
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.aqi import calculate_aqi
from app.core.station_selector import select_best_station_for_location
from app.core.constants import (
    CACHE_TTL_SECONDS,
    OPENAQ_HTTP_TIMEOUT_SECONDS,
)
from app.integrations.openaq.client import openaq_client, OpenAQClient
from app.integrations.cache.spatial_cache import spatial_temporal_cache, SpatialTemporalCache

TARGET_PARAMETERS = {
    "pm25",
    "pm10",
    "no2",
    "o3",
    "co",
    "so2",
    "temperature",
    "relativehumidity",
}

PREFERRED_UNITS = {
    "pm25": {"µg/m³", "ug/m3"},
    "pm10": {"µg/m³", "ug/m3"},
    "no2": {"µg/m³", "ug/m3"},
    "o3": {"µg/m³", "ug/m3"},
    "co": {"mg/m³", "mg/m3"},
    "so2": {"µg/m³", "ug/m3"},
    "temperature": {"°c", "c"},
    "relativehumidity": {"%"},
}

POLLUTANT_DISPLAY_NAMES = {
    "pm25": "PM2.5 (Fine Particulate Matter)",
    "pm10": "PM10 (Coarse Particulate Matter)",
    "no2": "NO₂ (Nitrogen Dioxide)",
    "o3": "O₃ (Ozone)",
    "co": "CO (Carbon Monoxide)",
    "so2": "SO₂ (Sulfur Dioxide)",
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _now_utc().isoformat()


def _display_time() -> str:
    return datetime.now().strftime("%I:%M %p")


def _parse_timestamp(value: Any) -> Optional[datetime]:
    """Parse an OpenAQ timestamp string/dict into an aware UTC datetime."""
    if not value:
        return None
    if isinstance(value, dict):
        value = value.get("utc") or value.get("local")
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _format_timestamp(value: Any) -> Optional[str]:
    """Format datetime into ISO string."""
    if not value:
        return None
    if isinstance(value, dict):
        value = value.get("utc") or value.get("local")
    return str(value) if value else None


class AirQualityService:
    """Service handling air quality observation orchestration, caching, and AQI computation."""

    def __init__(
        self,
        client: Optional[OpenAQClient] = None,
        cache: Optional[SpatialTemporalCache] = None,
    ):
        self.client = client or openaq_client
        self.cache = cache or spatial_temporal_cache

    def get_cached_pm25(self, lat: Optional[float] = None, lon: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Safely retrieves cached PM2.5 reading and metadata for coordinates or latest cache."""
        cached = None
        if lat is not None and lon is not None:
            cached = self.cache.get_observation(lat, lon)
        if not cached:
            cached = self.cache.get_latest_observation()

        if cached and cached.get("pollutants", {}).get("pm25", {}).get("value") is not None:
            pm25_val = float(cached["pollutants"]["pm25"]["value"])
            return {
                "pm25": pm25_val,
                "aqi": cached.get("aqi"),
                "is_cached": True,
                "cache_age_seconds": cached.get("cache_age_seconds", 0),
                "cache_expires_in_seconds": cached.get("cache_expires_in_seconds", CACHE_TTL_SECONDS),
                "cache_distance_meters": cached.get("cache_distance_meters", 0.0),
                "cached_at": cached.get("cached_at"),
                "cached_at_display": cached.get("cached_at_display"),
                "observed_at": cached.get("data_quality", {}).get("observed_at"),
            }
        return None

    def _select_sensors_to_fetch(self, station: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Deduplicates sensors prioritizing standard metric units."""
        sensors = station.get("sensors") or []
        selected: List[Dict[str, Any]] = []
        seen: set[str] = set()

        # Pass 1: preferred metric units
        for sensor in sensors:
            p_obj = sensor.get("parameter") or {}
            name = str(p_obj.get("name") or "").lower()
            unit = str(p_obj.get("units") or "").lower()
            if name in TARGET_PARAMETERS and unit in PREFERRED_UNITS.get(name, set()) and name not in seen:
                selected.append(sensor)
                seen.add(name)

        # Pass 2: remaining target sensors
        for sensor in sensors:
            p_obj = sensor.get("parameter") or {}
            name = str(p_obj.get("name") or "").lower()
            if name in TARGET_PARAMETERS and name not in seen:
                selected.append(sensor)
                seen.add(name)

        return selected

    async def _fetch_station_pollutants(
        self, station: Dict[str, Any], http_client: httpx.AsyncClient
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """Concurrently queries OpenAQ sensor measurements for the chosen station."""
        sensors = self._select_sensors_to_fetch(station)

        async def fetch_one(s: Dict[str, Any]) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
            s_id = s.get("id")
            p_obj = s.get("parameter") or {}
            p_name = str(p_obj.get("name") or "").lower()
            clean_key = "humidity" if p_name == "relativehumidity" else p_name

            raw_m = await self.client.fetch_sensor_latest_measurement(s_id, client=http_client)
            if not raw_m or raw_m.get("value") is None:
                return None, None

            period = raw_m.get("period") or {}
            datetime_to = period.get("datetimeTo") or {}
            observed_at = (
                datetime_to.get("utc")
                or datetime_to.get("local")
                or period.get("datetimeFrom", {}).get("utc")
            )

            return clean_key, {
                "value": round(float(raw_m["value"]), 2),
                "unit": p_obj.get("units") or "µg/m³",
                "label": p_obj.get("displayName") or p_name.upper(),
                "observed_at": observed_at,
                "sensor_id": s_id,
            }

        tasks = [fetch_one(s) for s in sensors]
        results = await asyncio.gather(*tasks)

        pollutants: Dict[str, Any] = {}
        for key, detail in results:
            if key and detail:
                pollutants.setdefault(key, detail)

        obs_dts = [_parse_timestamp(d.get("observed_at")) for d in pollutants.values()]
        obs_dts = [dt for dt in obs_dts if dt is not None]
        latest_time = max(obs_dts).isoformat() if obs_dts else None

        return pollutants, latest_time

    def _build_demo_payload(self, lat: float, lon: float, fetched_at: str, reason: str = "demo") -> Dict[str, Any]:
        """Builds demo telemetry response when OpenAQ API key is not configured."""
        pm25 = 78.4
        aqi_meta = calculate_aqi({"pm25": {"value": pm25}})

        return {
            "status": "success",
            "source": "demo_mode" if reason == "demo" else "fallback_mode",
            "coordinates": {"latitude": lat, "longitude": lon},
            "aqi": aqi_meta["aqi"],
            "dominant_pollutant": "PM2.5 (Fine Particulate Matter)",
            "dominant_pollutant_key": "pm25",
            "pollutant_aqis": aqi_meta.get("pollutant_aqis", {}),
            "pollutants": {
                "pm25": {"value": pm25, "unit": "µg/m³", "label": "PM2.5", "observed_at": fetched_at},
                "pm10": {"value": 142.0, "unit": "µg/m³", "label": "PM10", "observed_at": fetched_at},
                "no2": {"value": 34.2, "unit": "µg/m³", "label": "NO₂", "observed_at": fetched_at},
                "o3": {"value": 28.5, "unit": "µg/m³", "label": "O₃", "observed_at": fetched_at},
                "co": {"value": 1.1, "unit": "mg/m³", "label": "CO", "observed_at": fetched_at},
                "so2": {"value": 14.8, "unit": "µg/m³", "label": "SO₂", "observed_at": fetched_at},
                "temperature": {"value": 26.5, "unit": "°C", "label": "Temperature", "observed_at": fetched_at},
                "humidity": {"value": 54, "unit": "%", "label": "Humidity", "observed_at": fetched_at},
            },
            "station": {
                "id": 0,
                "name": "Demo Air Station" if reason == "demo" else "Fallback Air Station",
                "distance_km": 0.0,
                "provider": "Demo Provider (API Key Missing)" if reason == "demo" else "Fallback (Network Unavailable)",
                "latitude": lat,
                "longitude": lon,
                "last_updated": fetched_at,
                "selection_score": None,
                "confidence": "demo" if reason == "demo" else "fallback",
            },
            "data_quality": {
                "source": "DEMO" if reason == "demo" else "FALLBACK",
                "observed_at": fetched_at,
                "fetched_at": fetched_at,
                "is_cached": False,
                "status": "DEMO" if reason == "demo" else "FALLBACK",
            },
            "fetched_at": fetched_at,
            "fetched_at_display": _display_time(),
            "is_cached": False,
            "cache_age_seconds": 0,
            "cache_expires_in_seconds": CACHE_TTL_SECONDS,
            "cache_distance_meters": 0.0,
            "cache_anchor_lat": lat,
            "cache_anchor_lon": lon,
            "cached_at": fetched_at,
            "cached_at_display": _display_time(),
        }

    async def get_air_quality_telemetry(
        self, lat: float, lon: float, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Fetches complete normalized air quality telemetry using spatio-temporal caching."""
        # 1. Check spatio-temporal cache
        if not force_refresh:
            cached = self.cache.get_observation(lat, lon)
            if cached is not None:
                return cached

        fetched_at = _iso_now()
        timestamp = time.time()
        display_t = _display_time()

        # Check API key configuration
        if not self.client.has_api_key:
            demo_res = self._build_demo_payload(lat, lon, fetched_at, reason="demo")
            self.cache.store_observation(lat, lon, demo_res, timestamp, fetched_at, display_t)
            return demo_res

        try:
            async with httpx.AsyncClient(timeout=OPENAQ_HTTP_TIMEOUT_SECONDS) as http_client:
                # 2. Fetch candidates & select optimal station
                candidates = await self.client.fetch_candidate_locations(lat, lon, client=http_client)
                if not candidates:
                    fallback_res = self._build_demo_payload(lat, lon, fetched_at, reason="fallback")
                    self.cache.store_observation(lat, lon, fallback_res, timestamp, fetched_at, display_t)
                    return fallback_res

                selection_result = select_best_station_for_location(lat, lon, candidates)
                if not selection_result:
                    fallback_res = self._build_demo_payload(lat, lon, fetched_at, reason="fallback")
                    self.cache.store_observation(lat, lon, fallback_res, timestamp, fetched_at, display_t)
                    return fallback_res

                selected_station = selection_result["station"]
                provider = selected_station.get("provider") or {}
                provider_name = provider.get("name") if isinstance(provider, dict) else str(provider or "Government Air Network")

                station_coords = selected_station.get("coordinates") or {}
                station_lat = station_coords.get("latitude")
                station_lon = station_coords.get("longitude")

                station_info = {
                    "id": selected_station.get("id"),
                    "name": selected_station.get("name", "Local Air Monitor"),
                    "distance_km": selection_result["distance_km"],
                    "provider": provider_name,
                    "latitude": float(station_lat) if station_lat is not None else None,
                    "longitude": float(station_lon) if station_lon is not None else None,
                    "last_updated": _format_timestamp(selected_station.get("last_measurement") or selected_station.get("datetimeLast")),
                    "selection_score": selection_result["score"],
                    "confidence": selection_result["confidence"],
                    "score_breakdown": selection_result["score_breakdown"],
                    "selection_reason": selection_result["selection_reason"],
                }

                # 3. Fetch sensor measurements for chosen station
                pollutants, latest_obs_time = await self._fetch_station_pollutants(selected_station, http_client)
                if latest_obs_time:
                    station_info["last_updated"] = latest_obs_time

                # 4. Calculate AQI & sub-indices using core calculation engine
                aqi_meta = calculate_aqi(pollutants)
                aqi_score = aqi_meta.get("aqi") if aqi_meta.get("aqi") is not None else 0
                dominant_key = aqi_meta.get("dominant_pollutant")
                dominant_label = POLLUTANT_DISPLAY_NAMES.get(dominant_key, "Ambient Particulates")

                obs_dts = [_parse_timestamp(d.get("observed_at")) for d in pollutants.values()]
                obs_dts = [dt for dt in obs_dts if dt is not None]
                observed_at = max(obs_dts).isoformat() if obs_dts else station_info.get("last_updated")

                result = {
                    "status": "success",
                    "source": "OpenAQ",
                    "coordinates": {"latitude": lat, "longitude": lon},
                    "aqi": aqi_score,
                    "dominant_pollutant": dominant_label,
                    "dominant_pollutant_key": dominant_key,
                    "pollutant_aqis": aqi_meta.get("pollutant_aqis", {}),
                    "pollutants": pollutants,
                    "station": station_info,
                    "data_quality": {
                        "source": "OpenAQ",
                        "observed_at": observed_at,
                        "fetched_at": fetched_at,
                        "is_cached": False,
                        "status": "LIVE",
                    },
                    "fetched_at": fetched_at,
                    "fetched_at_display": display_t,
                    "is_cached": False,
                    "cache_age_seconds": 0,
                    "cache_expires_in_seconds": CACHE_TTL_SECONDS,
                    "cache_distance_meters": 0.0,
                    "cache_anchor_lat": lat,
                    "cache_anchor_lon": lon,
                    "cached_at": fetched_at,
                    "cached_at_display": display_t,
                }

                # 5. Store in spatio-temporal cache
                self.cache.store_observation(lat, lon, result, timestamp, fetched_at, display_t)
                return result

        except Exception as exc:
            print(f"[AirQualityService] Error querying OpenAQ: {exc}")
            fallback_res = self._build_demo_payload(lat, lon, fetched_at, reason="fallback")
            self.cache.store_observation(lat, lon, fallback_res, timestamp, fetched_at, display_t)
            return fallback_res


# Global singleton instance
air_quality_service = AirQualityService()
