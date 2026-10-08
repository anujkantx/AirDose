"""Location Service for AirDose.
Handles geofence detection using Haversine distance,
environment resolution (HOME, OFFICE, COLLEGE, OUTDOOR, etc.),
and boundary hysteresis / debouncing to prevent flapping on noisy GPS data.
"""

import math
from typing import Dict, Any, Optional, List, Tuple
from app.core.constants import (
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    DEFAULT_PLACE_RADIUS_METERS,
    HYSTERESIS_BUFFER_METERS,
    HYSTERESIS_SAMPLE_THRESHOLD,
)
from app.database import get_user_locations, get_user_location_by_id


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class LocationService:
    """Service to evaluate user environments from GPS coordinates."""

    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        return haversine_distance(lat1, lon1, lat2, lon2)

    @staticmethod
    def find_matching_saved_place(
        user_id: int, lat: float, lon: float
    ) -> Optional[Dict[str, Any]]:
        """Finds closest saved place where distance <= radius_meters."""
        places = get_user_locations(user_id)
        best_match = None
        min_dist = float("inf")

        for place in places:
            p_lat = place["latitude"]
            p_lon = place["longitude"]
            radius = place.get("radius_meters") or DEFAULT_PLACE_RADIUS_METERS
            dist = haversine_distance(lat, lon, p_lat, p_lon)

            if dist <= radius and dist < min_dist:
                min_dist = dist
                best_match = dict(place)
                best_match["distance_m"] = round(dist, 1)

        return best_match

    @staticmethod
    def resolve_environment(
        user_id: int,
        lat: float,
        lon: float,
        accuracy: Optional[float] = None,
        previous_place_id: Optional[int] = None,
        outside_sample_count: int = 0,
    ) -> Tuple[Dict[str, Any], int]:
        """Resolves current environment with hysteresis / debouncing.
        Returns:
            (environment_info, new_outside_sample_count)
        """
        places = get_user_locations(user_id)

        # 1. Check if user was previously in a saved place and test with hysteresis
        if previous_place_id is not None:
            prev_place = next((p for p in places if p["id"] == previous_place_id), None)
            if prev_place:
                dist = haversine_distance(
                    lat, lon, prev_place["latitude"], prev_place["longitude"]
                )
                radius = prev_place.get("radius_meters") or DEFAULT_PLACE_RADIUS_METERS
                # Dynamic hysteresis buffer accounting for GPS accuracy
                acc_buffer = (accuracy * 0.3) if (accuracy and accuracy > 0) else 10.0
                effective_boundary = radius + HYSTERESIS_BUFFER_METERS + acc_buffer

                if dist <= effective_boundary:
                    # Within buffered boundary: maintain current place
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
        for place in places:
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

        # 3. User is outside all saved places
        return {
            "environment": "OUTDOOR",
            "location_id": None,
            "location_name": "Outdoor Environment",
            "infiltration_factor": OUTDOOR_FACTOR,
            "distance_m": None,
            "is_inside_saved_place": False,
        }, 0
