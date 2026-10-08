"""Location Service for AirDose.

Handles CRUD management of user saved locations and evaluates user environments
from GPS coordinates using core location resolver.
"""

from typing import Dict, Any, Optional, List, Tuple
from app.core.haversine import haversine_distance
from app.core.location_resolver import resolve_user_environment
from app.core.constants import (
    DEFAULT_PLACE_RADIUS_METERS,
    MIN_PLACE_RADIUS_METERS,
    MAX_PLACE_RADIUS_METERS,
)
from app.repositories.location_repository import LocationRepository


class LocationService:
    """Service to manage saved places and evaluate user environments from GPS coordinates."""

    @staticmethod
    def create_user_location(
        user_id: int,
        location_type: str,
        name: str,
        latitude: float,
        longitude: float,
        address: str = "",
        radius_meters: float = DEFAULT_PLACE_RADIUS_METERS,
        indoor_coefficient: Optional[float] = 0.5,
        questionnaire_json: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a new saved location for a user."""
        coeff = indoor_coefficient if indoor_coefficient is not None else 0.5
        raw_rad = float(radius_meters) if radius_meters is not None else DEFAULT_PLACE_RADIUS_METERS
        rad = max(MIN_PLACE_RADIUS_METERS, min(MAX_PLACE_RADIUS_METERS, raw_rad))

        return LocationRepository.create_location(
            user_id=user_id,
            location_type=location_type,
            name=name,
            latitude=latitude,
            longitude=longitude,
            address=address,
            radius_meters=rad,
            indoor_coefficient=coeff,
            questionnaire_json=questionnaire_json,
        )

    @staticmethod
    def get_user_locations(user_id: int) -> List[Dict[str, Any]]:
        """Fetches all saved locations for a given user."""
        return LocationRepository.get_locations_by_user(user_id)

    @staticmethod
    def get_user_location_by_id(location_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single location by its ID and user ID."""
        return LocationRepository.get_location_by_id(location_id, user_id)

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
        existing = LocationRepository.get_location_by_id(location_id, user_id)
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

        return LocationRepository.update_location(
            location_id=location_id,
            user_id=user_id,
            name=new_name,
            location_type=new_type,
            latitude=new_lat,
            longitude=new_lon,
            address=new_addr,
            radius_meters=new_rad,
            indoor_coefficient=new_coeff,
            questionnaire_json=new_q,
        )

    @staticmethod
    def delete_user_location(location_id: int, user_id: int) -> bool:
        """Deletes a saved location for a user."""
        return LocationRepository.delete_location(location_id, user_id)

    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        return haversine_distance(lat1, lon1, lat2, lon2)

    @staticmethod
    def resolve_environment(
        user_id: int,
        lat: float,
        lon: float,
        accuracy: Optional[float] = None,
        previous_place_id: Optional[int] = None,
        outside_sample_count: int = 0,
    ) -> Tuple[Dict[str, Any], int]:
        """Resolves current environment with hysteresis debouncing using core resolver."""
        places = LocationRepository.get_locations_by_user(user_id)
        return resolve_user_environment(
            lat=lat,
            lon=lon,
            saved_places=places,
            accuracy=accuracy,
            previous_place_id=previous_place_id,
            outside_sample_count=outside_sample_count,
        )


# Functional aliases for backward compatibility
create_user_location = LocationService.create_user_location
get_user_locations = LocationService.get_user_locations
get_user_location_by_id = LocationService.get_user_location_by_id
update_user_location = LocationService.update_user_location
delete_user_location = LocationService.delete_user_location
location_service = LocationService()
