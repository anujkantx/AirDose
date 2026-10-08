"""Router for managing user saved location coordinate points."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Query
from app.database import create_user_location, get_user_locations, delete_user_location
from app.models import UserLocationCreate, UserLocationOut

router = APIRouter(prefix="/api/locations", tags=["Saved Locations"])


@router.get("", response_model=List[UserLocationOut])
def get_locations(user_id: Optional[int] = Query(None)):
    """Fetches all saved location points (home, office, college, other) for a user."""
    target_user_id = user_id if user_id else 1
    locations = get_user_locations(target_user_id)
    return [
        UserLocationOut(
            id=loc["id"],
            user_id=loc["user_id"],
            location_type=loc["location_type"],
            name=loc["name"],
            latitude=loc["latitude"],
            longitude=loc["longitude"],
            address=loc.get("address", ""),
            created_at=str(loc.get("created_at", "")),
        )
        for loc in locations
    ]


@router.post("", response_model=UserLocationOut)
def add_location(payload: UserLocationCreate):
    """Saves a new location point with geographic coordinates."""
    user_id = payload.user_id if payload.user_id else 1
    if not payload.name or not payload.location_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and location_type are required.",
        )

    valid_types = ["home", "office", "college", "other"]
    loc_type = payload.location_type.strip().lower()
    if loc_type not in valid_types:
        loc_type = "other"

    try:
        new_loc = create_user_location(
            user_id=user_id,
            location_type=loc_type,
            name=payload.name.strip(),
            latitude=payload.latitude,
            longitude=payload.longitude,
            address=payload.address or "",
        )
        return UserLocationOut(
            id=new_loc["id"],
            user_id=new_loc["user_id"],
            location_type=new_loc["location_type"],
            name=new_loc["name"],
            latitude=new_loc["latitude"],
            longitude=new_loc["longitude"],
            address=new_loc.get("address", ""),
            created_at=str(new_loc.get("created_at", "")),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save location point: {str(e)}",
        )


@router.delete("/{location_id}")
def remove_location(location_id: int, user_id: Optional[int] = Query(None)):
    """Deletes a saved location point record."""
    target_user_id = user_id if user_id else 1
    success = delete_user_location(location_id, target_user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location point not found or unauthorized.",
        )
    return {"success": True, "message": "Location deleted successfully"}
