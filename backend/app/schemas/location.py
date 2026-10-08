"""Saved geofenced places and micro-environment infiltration schemas."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class LocationQuestionnaire(BaseModel):
    enclosure: Optional[str] = "fully_enclosed"
    window_opening: Optional[str] = "sometimes"
    ventilation_type: Optional[str] = "natural"
    ac_usage: Optional[str] = "no_ac"
    air_purifier: Optional[str] = "no_purifier"


class UserLocationCreate(BaseModel):
    user_id: Optional[int] = None
    location_type: str  # "home", "office", "college", "other"
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = ""
    radius_meters: Optional[float] = Field(default=50.0, ge=50.0, le=500.0, description="Geofence radius (50m - 500m)")
    indoor_coefficient: Optional[float] = 0.5
    infiltration_factor: Optional[float] = 0.5
    questionnaire: Optional[LocationQuestionnaire] = None


class UserLocationUpdate(BaseModel):
    name: Optional[str] = None
    location_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    radius_meters: Optional[float] = Field(default=None, ge=50.0, le=500.0, description="Geofence radius (50m - 500m)")
    indoor_coefficient: Optional[float] = None
    infiltration_factor: Optional[float] = None
    questionnaire: Optional[LocationQuestionnaire] = None


class UserLocationOut(BaseModel):
    id: int
    user_id: int
    location_type: str
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = ""
    radius_meters: float = 50.0
    indoor_coefficient: float = 0.5
    infiltration_factor: float = 0.5
    questionnaire: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
