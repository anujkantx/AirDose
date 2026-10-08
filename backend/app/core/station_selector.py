"""Station Selection Engine.
Multi-factor suitability scoring algorithm for selecting the optimal air monitoring station
based on distance, data freshness, sensor coverage (prioritizing PM2.5), and metadata quality.
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from app.core.haversine import haversine_distance

# Weights for sensor coverage calculation
POLLUTANT_WEIGHTS: Dict[str, float] = {
    "pm25": 1.0,
    "pm10": 0.7,
    "no2": 0.5,
    "o3": 0.5,
    "co": 0.3,
    "so2": 0.3,
    "temperature": 0.2,
    "humidity": 0.2,
}
MAX_SENSOR_POINTS: float = sum(POLLUTANT_WEIGHTS.values())

# Score composition weights (Total = 1.0)
WEIGHT_DISTANCE: float = 0.45
WEIGHT_FRESHNESS: float = 0.35
WEIGHT_SENSORS: float = 0.15
WEIGHT_QUALITY: float = 0.05


def calculate_distance_score(distance_km: float) -> float:
    """Exponential distance decay score: exp(-distance_km / 10.0)."""
    return math.exp(-max(0.0, distance_km) / 10.0)


def calculate_freshness_score(age_hours: float) -> float:
    """Exponential freshness decay score: exp(-age_hours / 6.0)."""
    return math.exp(-max(0.0, age_hours) / 6.0)


def parse_station_timestamp(station: Dict[str, Any]) -> Optional[datetime]:
    """Extracts and parses datetime from station last_measurement or datetimeLast metadata."""
    last_up = station.get("last_measurement") or station.get("datetimeLast")
    ts_str = None
    if isinstance(last_up, dict):
        ts_str = last_up.get("utc") or last_up.get("local")
    elif isinstance(last_up, str):
        ts_str = last_up

    if not ts_str:
        return None

    try:
        # Handles ISO strings like '2026-10-07T14:30:00Z' or '+05:30'
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return None


def calculate_sensor_score(sensors: List[Dict[str, Any]]) -> Tuple[float, bool, List[str]]:
    """Calculates weighted sensor availability score and checks PM2.5 availability."""
    found_pollutants = set()
    for s in sensors:
        p_obj = s.get("parameter", {})
        p_name = p_obj.get("name", "").lower()
        if p_name == "relativehumidity":
            p_name = "humidity"
        if p_name:
            found_pollutants.add(p_name)

    has_pm25 = "pm25" in found_pollutants
    points = sum(POLLUTANT_WEIGHTS.get(p, 0.1) for p in found_pollutants)
    sensor_score = min(1.0, points / MAX_SENSOR_POINTS)

    return sensor_score, has_pm25, sorted(list(found_pollutants))


def calculate_station_distance_km(user_lat: float, user_lon: float, station: Dict[str, Any]) -> float:
    """Extracts native distance_meters or computes Haversine distance in km."""
    d_meters = station.get("distance_meters")
    if d_meters is None:
        d_meters = station.get("distance")
    if d_meters is not None:
        try:
            return round(float(d_meters) / 1000.0, 3)
        except (ValueError, TypeError):
            pass

    # Fallback to coordinates
    coords = station.get("coordinates") or {}
    s_lat, s_lon = coords.get("latitude"), coords.get("longitude")
    if s_lat is not None and s_lon is not None:
        d_m = haversine_distance(user_lat, user_lon, float(s_lat), float(s_lon))
        return round(d_m / 1000.0, 3)

    return 25.0


def score_station(
    user_lat: float,
    user_lon: float,
    station: Dict[str, Any],
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Computes comprehensive multi-factor suitability score for a candidate station."""
    if now is None:
        now = datetime.now(timezone.utc)

    # 1. Distance Factor
    dist_km = calculate_station_distance_km(user_lat, user_lon, station)
    dist_score = calculate_distance_score(dist_km)

    # 2. Freshness Factor
    station_dt = parse_station_timestamp(station)
    if station_dt:
        if station_dt.tzinfo is None:
            station_dt = station_dt.replace(tzinfo=timezone.utc)
        age_seconds = max(0.0, (now - station_dt).total_seconds())
        age_hours = age_seconds / 3600.0
        freshness_score = calculate_freshness_score(age_hours)
    else:
        age_hours = 72.0  # Assume stale if unknown
        freshness_score = 0.05

    # 3. Sensor Factor
    sensors = station.get("sensors", [])
    sensor_score, has_pm25, available_pollutants = calculate_sensor_score(sensors)

    # 4. Metadata Quality Factor
    provider = station.get("provider", {})
    provider_name = provider.get("name") if isinstance(provider, dict) else str(provider or "")
    quality_score = 0.5
    if provider_name and provider_name != "Unknown":
        quality_score += 0.3
    if station.get("coordinates"):
        quality_score += 0.2
    quality_score = min(1.0, quality_score)

    # 5. Composite Final Score with PM2.5 gating multiplier
    raw_composite = (
        WEIGHT_DISTANCE * dist_score
        + WEIGHT_FRESHNESS * freshness_score
        + WEIGHT_SENSORS * sensor_score
        + WEIGHT_QUALITY * quality_score
    )

    # PM2.5 is paramount for AirDose respiratory dose calculations: 40% penalty if missing
    pm25_multiplier = 1.0 if has_pm25 else 0.60
    final_score = round(raw_composite * pm25_multiplier, 4)

    # Confidence classification
    if final_score >= 0.70:
        confidence = "high"
    elif final_score >= 0.40:
        confidence = "medium"
    else:
        confidence = "low"

    # Human-readable selection reason summary
    reason_parts = []
    if dist_km <= 5.0:
        reason_parts.append(f"Very close ({dist_km:.1f} km)")
    elif dist_km <= 15.0:
        reason_parts.append(f"Moderate range ({dist_km:.1f} km)")
    else:
        reason_parts.append(f"Extended range ({dist_km:.1f} km)")

    if age_hours <= 1.0:
        reason_parts.append("real-time fresh telemetry (<1h)")
    elif age_hours <= 6.0:
        reason_parts.append(f"recent data ({age_hours:.1f}h old)")
    elif age_hours <= 24.0:
        reason_parts.append(f"same-day data ({age_hours:.1f}h old)")
    else:
        reason_parts.append(f"stale data ({age_hours / 24.0:.1f}d old)")

    if has_pm25:
        reason_parts.append("active PM2.5 sensor")
    else:
        reason_parts.append("PM2.5 missing")

    return {
        "station": station,
        "score": final_score,
        "confidence": confidence,
        "distance_km": dist_km,
        "age_hours": round(age_hours, 2),
        "has_pm25": has_pm25,
        "available_pollutants": available_pollutants,
        "score_breakdown": {
            "distance_score": round(dist_score, 4),
            "freshness_score": round(freshness_score, 4),
            "sensor_score": round(sensor_score, 4),
            "quality_score": round(quality_score, 4),
        },
        "selection_reason": {
            "distance_km": dist_km,
            "data_age_hours": round(age_hours, 2),
            "available_sensors": available_pollutants,
            "summary": "; ".join(reason_parts),
        },
    }


def select_best_station_for_location(
    user_lat: float,
    user_lon: float,
    candidate_stations: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Evaluates and ranks candidate stations to select the single best station.

    Filtering & Ranking Strategy:
    1. Filter out candidate stations with 0 sensors.
    2. Score all valid candidates across distance, freshness, sensor coverage, and metadata.
    3. Return candidate with the highest composite suitability score.
    """
    if not candidate_stations:
        return None

    # Step 1: Filter stations having active sensors
    valid_candidates = [s for s in candidate_stations if s.get("sensors")]
    if not valid_candidates:
        return None

    # Step 2: Score each candidate station
    now_utc = datetime.now(timezone.utc)
    scored_candidates = [
        score_station(user_lat, user_lon, station, now=now_utc)
        for station in valid_candidates
    ]

    # Step 3: Sort by highest score descending
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)

    return scored_candidates[0]
