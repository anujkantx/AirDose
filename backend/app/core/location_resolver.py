"""Pure Geofencing & Micro-Environment Resolution Engine.

Determines the user's micro-environment (HOME, OFFICE, COLLEGE, OUTDOOR, etc.)
given GPS coordinates, user saved places, and previous tracking state.
Uses dynamic hysteresis debouncing to prevent bouncing at boundary edges.
Zero dependencies on SQLite or FastAPI.
"""

from typing import Dict, Any, Optional, List, Tuple
from app.core.haversine import haversine_distance
from app.core.constants import (
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    DEFAULT_PLACE_RADIUS_METERS,
    HYSTERESIS_BUFFER_METERS,
    HYSTERESIS_SAMPLE_THRESHOLD,
)


def resolve_user_environment(
    lat: float,
    lon: float,
    saved_places: List[Dict[str, Any]],
    accuracy: Optional[float] = None,
    previous_place_id: Optional[int] = None,
    outside_sample_count: int = 0,
) -> Tuple[Dict[str, Any], int]:
    """Resolves micro-environment with hysteresis debouncing.

    Args:
        lat: Current user latitude
        lon: Current user longitude
        saved_places: List of user saved place dicts
        accuracy: Optional GPS accuracy in meters
        previous_place_id: ID of the previously occupied place
        outside_sample_count: Number of consecutive readings outside previous place

    Returns:
        (environment_info_dict, new_outside_sample_count)
    """
    # 1. Check if user was previously in a saved place and test with hysteresis buffer
    if previous_place_id is not None:
        prev_place = next((p for p in saved_places if p["id"] == previous_place_id), None)
        if prev_place:
            dist = haversine_distance(
                lat, lon, prev_place["latitude"], prev_place["longitude"]
            )
            radius = prev_place.get("radius_meters") or DEFAULT_PLACE_RADIUS_METERS
            acc_buffer = (accuracy * 0.3) if (accuracy and accuracy > 0) else 10.0
            effective_boundary = radius + HYSTERESIS_BUFFER_METERS + acc_buffer

            if dist <= effective_boundary:
                # Within buffered boundary: maintain previous place
                coeff = prev_place.get("indoor_coefficient")
                infiltration = coeff if coeff is not None else DEFAULT_INDOOR_FACTOR
                return {
                    "environment": (prev_place.get("location_type") or "HOME").upper(),
                    "location_id": prev_place["id"],
                    "location_name": prev_place["name"],
                    "infiltration_factor": float(infiltration),
                    "distance_m": round(dist, 1),
                    "is_inside_saved_place": True,
                }, 0
            else:
                # Outside buffered boundary: increment counter
                new_outside_count = outside_sample_count + 1
                if new_outside_count < HYSTERESIS_SAMPLE_THRESHOLD:
                    # Debounce: hold previous environment for one more noisy reading
                    coeff = prev_place.get("indoor_coefficient")
                    infiltration = coeff if coeff is not None else DEFAULT_INDOOR_FACTOR
                    return {
                        "environment": (prev_place.get("location_type") or "HOME").upper(),
                        "location_id": prev_place["id"],
                        "location_name": prev_place["name"],
                        "infiltration_factor": float(infiltration),
                        "distance_m": round(dist, 1),
                        "is_inside_saved_place": True,
                    }, new_outside_count

    # 2. Check all saved places for standard entry
    best_place = None
    min_dist = float("inf")
    for place in saved_places:
        dist = haversine_distance(
            lat, lon, place["latitude"], place["longitude"]
        )
        radius = place.get("radius_meters") or DEFAULT_PLACE_RADIUS_METERS
        if dist <= radius and dist < min_dist:
            min_dist = dist
            best_place = place

    if best_place:
        coeff = best_place.get("indoor_coefficient")
        infiltration = coeff if coeff is not None else DEFAULT_INDOOR_FACTOR
        return {
            "environment": (best_place.get("location_type") or "OTHER").upper(),
            "location_id": best_place["id"],
            "location_name": best_place["name"],
            "infiltration_factor": float(infiltration),
            "distance_m": round(min_dist, 1),
            "is_inside_saved_place": True,
        }, 0

    # 3. Outside all saved places -> OUTDOOR
    return {
        "environment": "OUTDOOR",
        "location_id": None,
        "location_name": "Outdoor Environment",
        "infiltration_factor": OUTDOOR_FACTOR,
        "distance_m": None,
        "is_inside_saved_place": False,
    }, 0
