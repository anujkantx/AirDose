"""Location Service for AirDose.
Handles CRUD management of user saved locations,
geofence detection using Haversine distance,
environment resolution (HOME, OFFICE, COLLEGE, OUTDOOR, etc.),
and boundary hysteresis / debouncing to prevent flapping on noisy GPS data.
"""

import math
from typing import Dict, Any, Optional, List, Tuple
from app.core.constants import (
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    DEFAULT_PLACE_RADIUS_METERS,
    MIN_PLACE_RADIUS_METERS,
    MAX_PLACE_RADIUS_METERS,
    HYSTERESIS_BUFFER_METERS,
    HYSTERESIS_SAMPLE_THRESHOLD,
)
from app.db.connection import get_db


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
    """Service to manage saved places CRUD and evaluate user environments from GPS coordinates."""

    # ------------------- CRUD Operations -------------------

    @staticmethod
    def create_user_location(
        user_id: int,
        location_type: str,
        name: str,
        latitude: float,
        longitude: float,
        address: str = "",
        radius_meters: float = 50.0,
        indoor_coefficient: Optional[float] = 0.5,
        questionnaire_json: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a new saved location for a user."""
        coeff = indoor_coefficient if indoor_coefficient is not None else 0.5
        raw_rad = float(radius_meters) if radius_meters is not None else DEFAULT_PLACE_RADIUS_METERS
        rad = max(MIN_PLACE_RADIUS_METERS, min(MAX_PLACE_RADIUS_METERS, raw_rad))
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO user_locations (user_id, location_type, name, latitude, longitude, address, radius_meters, indoor_coefficient, questionnaire_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, location_type.strip().lower(), name.strip(), float(latitude), float(longitude), address.strip(), float(rad), float(coeff), questionnaire_json)
            )
            loc_id = cursor.lastrowid
            cursor.execute("SELECT * FROM user_locations WHERE id = ?", (loc_id,))
            return dict(cursor.fetchone())

    @staticmethod
    def get_user_locations(user_id: int) -> List[Dict[str, Any]]:
        """Fetches all saved locations for a given user."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM user_locations WHERE user_id = ? ORDER BY id DESC",
                (user_id,)
            )
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_user_location_by_id(location_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single location by its ID and user ID."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM user_locations WHERE id = ? AND user_id = ?",
                (location_id, user_id)
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def update_user_location(
        location_id: int,
        user_id: int,
        name: Optional[str] = None,
        location_type: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        address: Optional[str] = None,
        radius_meters: Optional[float] = None,
        indoor_coefficient: Optional[float] = None,
        questionnaire_json: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates an existing saved location."""
        with get_db() as conn:
            cursor = conn.cursor()
            existing = LocationService.get_user_location_by_id(location_id, user_id)
            if not existing:
                return None

            new_name = name.strip() if name is not None else existing["name"]
            new_type = location_type.strip().lower() if location_type is not None else existing["location_type"]
            new_lat = float(latitude) if latitude is not None else existing["latitude"]
            new_lon = float(longitude) if longitude is not None else existing["longitude"]
            new_addr = address if address is not None else existing["address"]
            raw_rad = float(radius_meters) if radius_meters is not None else existing["radius_meters"]
            new_rad = max(MIN_PLACE_RADIUS_METERS, min(MAX_PLACE_RADIUS_METERS, raw_rad))
            new_coeff = float(indoor_coefficient) if indoor_coefficient is not None else existing["indoor_coefficient"]
            new_q = questionnaire_json if questionnaire_json is not None else existing.get("questionnaire_json")

            cursor.execute(
                """UPDATE user_locations
                   SET name = ?, location_type = ?, latitude = ?, longitude = ?, address = ?, radius_meters = ?, indoor_coefficient = ?, questionnaire_json = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND user_id = ?""",
                (new_name, new_type, new_lat, new_lon, new_addr, new_rad, new_coeff, new_q, location_id, user_id)
            )
            cursor.execute("SELECT * FROM user_locations WHERE id = ?", (location_id,))
            return dict(cursor.fetchone())

    @staticmethod
    def delete_user_location(location_id: int, user_id: int) -> bool:
        """Deletes a saved location for a user."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM user_locations WHERE id = ? AND user_id = ?",
                (location_id, user_id)
            )
            return cursor.rowcount > 0

    # ------------------- Geofencing & Environment Resolution -------------------

    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        return haversine_distance(lat1, lon1, lat2, lon2)

    @staticmethod
    def find_matching_saved_place(
        user_id: int, lat: float, lon: float
    ) -> Optional[Dict[str, Any]]:
        """Finds closest saved place where distance <= radius_meters."""
        places = LocationService.get_user_locations(user_id)
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
        places = LocationService.get_user_locations(user_id)

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


# Functional exports for backward compatibility and clean imports
create_user_location = LocationService.create_user_location
get_user_locations = LocationService.get_user_locations
get_user_location_by_id = LocationService.get_user_location_by_id
update_user_location = LocationService.update_user_location
delete_user_location = LocationService.delete_user_location
location_service = LocationService()
