import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.database import (
    create_user_location,
    get_user_locations,
    delete_user_location,
    update_user_location,
    get_user_location_by_id,
)
from app.schemas import UserLocationCreate, UserLocationUpdate, UserLocationOut, LocationQuestionnaire
from app.auth_deps import get_current_user_id
from app.core import calculate_infiltration_factor

router = APIRouter(prefix="/api/locations", tags=["Saved Locations"])


def _format_location_out(loc: Dict[str, Any]) -> UserLocationOut:
    q_dict = None
    q_raw = loc.get("questionnaire_json")
    if q_raw:
        try:
            q_dict = json.loads(q_raw)
        except Exception:
            q_dict = None

    coeff = loc.get("indoor_coefficient")
    if coeff is None:
        coeff = 0.5

    return UserLocationOut(
        id=loc["id"],
        user_id=loc["user_id"],
        location_type=loc["location_type"],
        name=loc["name"],
        latitude=loc["latitude"],
        longitude=loc["longitude"],
        address=loc.get("address", ""),
        radius_meters=loc.get("radius_meters") or 50.0,
        indoor_coefficient=coeff,
        infiltration_factor=coeff,
        questionnaire=q_dict,
        created_at=str(loc.get("created_at", "")),
        updated_at=str(loc.get("updated_at", "")),
    )


@router.get("", response_model=List[UserLocationOut])
def get_locations(user_id: int = Depends(get_current_user_id)):
    locations = get_user_locations(user_id)
    return [_format_location_out(loc) for loc in locations]


@router.post("", response_model=UserLocationOut)
def add_location(
    payload: UserLocationCreate,
    user_id: int = Depends(get_current_user_id),
):
    if not payload.name or not payload.location_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and location_type are required.",
        )

    valid_types = ["home", "office", "college", "other"]
    loc_type = payload.location_type.strip().lower()
    if loc_type not in valid_types:
        loc_type = "other"

    radius = max(50.0, min(500.0, float(payload.radius_meters or 50.0)))

    q_json = None
    if payload.questionnaire:
        q_data = payload.questionnaire.model_dump()
        indoor_coeff = calculate_infiltration_factor(q_data)
        q_json = json.dumps(q_data)
    elif payload.infiltration_factor is not None:
        indoor_coeff = round(max(0.10, min(1.00, payload.infiltration_factor)), 2)
    elif payload.indoor_coefficient is not None:
        indoor_coeff = round(max(0.10, min(1.00, payload.indoor_coefficient)), 2)
    else:
        indoor_coeff = 0.50

    try:
        new_loc = create_user_location(
            user_id=user_id,
            location_type=loc_type,
            name=payload.name.strip(),
            latitude=payload.latitude,
            longitude=payload.longitude,
            address=payload.address or "",
            radius_meters=radius,
            indoor_coefficient=indoor_coeff,
            questionnaire_json=q_json,
        )
        return _format_location_out(new_loc)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save location point: {str(e)}",
        )


@router.put("/{location_id}", response_model=UserLocationOut)
def edit_location(
    location_id: int,
    payload: UserLocationUpdate,
    user_id: int = Depends(get_current_user_id),
):
    """Updates an existing saved place's parameters (radius, indoor coefficient, coordinates, questionnaire)."""
    q_json = None
    indoor_coeff = payload.indoor_coefficient

    if payload.questionnaire:
        q_data = payload.questionnaire.model_dump()
        indoor_coeff = calculate_infiltration_factor(q_data)
        q_json = json.dumps(q_data)
    elif payload.infiltration_factor is not None:
        indoor_coeff = round(max(0.10, min(1.00, payload.infiltration_factor)), 2)

    updated = update_user_location(
        location_id=location_id,
        user_id=user_id,
        name=payload.name,
        location_type=payload.location_type,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        radius_meters=payload.radius_meters,
        indoor_coefficient=indoor_coeff,
        questionnaire_json=q_json,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location point not found or unauthorized.",
        )
    return _format_location_out(updated)


@router.delete("/{location_id}")
def remove_location(
    location_id: int,
    user_id: int = Depends(get_current_user_id),
):
    """Deletes a saved location point record."""
    success = delete_user_location(location_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location point not found or unauthorized.",
        )
    return {"success": True, "message": "Location deleted successfully"}

