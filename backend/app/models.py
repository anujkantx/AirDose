"""Pydantic data models for AirDose authentication, locations, and exposure tracking."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str


class SignInRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: UserOut


# User Saved Places Models
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


# Exposure Tracking Models
class TrackLocationRequest(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    breathing_factor: Optional[float] = 1.0
    client_timestamp: Optional[float] = None


class CurrentExposureInfo(BaseModel):
    pm25: float
    environment: str
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    infiltration_factor: float
    breathing_factor: float
    base_breathing_rate_m3_s: float
    inhalation_rate_ug_s: float
    last_pollution_updated_seconds_ago: int = 0
    is_cached: Optional[bool] = False
    cache_expires_in_seconds: Optional[int] = 1800
    cache_distance_meters: Optional[float] = 0.0
    cached_at: Optional[str] = None
    cached_at_display: Optional[str] = None


class TodayExposureResponse(BaseModel):
    date: str
    total_exposure_ug: float
    current: Optional[CurrentExposureInfo] = None
    contributions: Dict[str, float]
    tracking: bool = False


class HistoryDataPoint(BaseModel):
    date: str
    label: str
    exposure_ug: float


class ExposureHistoryResponse(BaseModel):
    period: str
    start_date: str
    end_date: str
    data: List[HistoryDataPoint]