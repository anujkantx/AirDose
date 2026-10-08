"""User Saved Locations Database Repository.

Pure data access layer for saved places CRUD operations.
Zero HTTP or business logic.
"""

from typing import Dict, Any, Optional, List
from app.db.connection import get_db


class LocationRepository:
    """Repository for user saved locations (HOME, OFFICE, COLLEGE, etc.)."""

    @staticmethod
    def create_location(
        user_id: int,
        location_type: str,
        name: str,
        latitude: float,
        longitude: float,
        address: str = "",
        radius_meters: float = 50.0,
        indoor_coefficient: float = 0.5,
        questionnaire_json: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Inserts a new user saved place."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO user_locations (
                    user_id, location_type, name, latitude, longitude,
                    address, radius_meters, indoor_coefficient, questionnaire_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id,
                    location_type.strip().lower(),
                    name.strip(),
                    float(latitude),
                    float(longitude),
                    address.strip(),
                    float(radius_meters),
                    float(indoor_coefficient),
                    questionnaire_json,
                ),
            )
            loc_id = cursor.lastrowid
            cursor.execute("SELECT * FROM user_locations WHERE id = ?", (loc_id,))
            return dict(cursor.fetchone())

    @staticmethod
    def get_locations_by_user(user_id: int) -> List[Dict[str, Any]]:
        """Retrieves all saved places for a user."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM user_locations WHERE user_id = ? ORDER BY id DESC",
                (user_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_location_by_id(location_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single location by ID and user ID."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM user_locations WHERE id = ? AND user_id = ?",
                (location_id, user_id),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def update_location(
        location_id: int,
        user_id: int,
        name: str,
        location_type: str,
        latitude: float,
        longitude: float,
        address: str,
        radius_meters: float,
        indoor_coefficient: float,
        questionnaire_json: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates an existing location record."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE user_locations
                   SET name = ?, location_type = ?, latitude = ?, longitude = ?,
                       address = ?, radius_meters = ?, indoor_coefficient = ?,
                       questionnaire_json = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND user_id = ?""",
                (
                    name,
                    location_type,
                    latitude,
                    longitude,
                    address,
                    radius_meters,
                    indoor_coefficient,
                    questionnaire_json,
                    location_id,
                    user_id,
                ),
            )
            if cursor.rowcount == 0:
                return None
            cursor.execute("SELECT * FROM user_locations WHERE id = ?", (location_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def delete_location(location_id: int, user_id: int) -> bool:
        """Deletes a saved location record."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM user_locations WHERE id = ? AND user_id = ?",
                (location_id, user_id),
            )
            return cursor.rowcount > 0
