"""Pydantic data models for AirDose MVP authentication and dashboard."""

from pydantic import BaseModel, EmailStr
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


class DashboardStatItem(BaseModel):
    label: str
    value: str
    change: str
    trend: str  # "up" | "down" | "neutral"


class ActivityItem(BaseModel):
    id: str
    action: str
    detail: str
    timestamp: str
    status: str


class DashboardStatsResponse(BaseModel):
    overview: List[DashboardStatItem]
    recent_activities: List[ActivityItem]
    system_health: str
    registered_users_count: int


class UserLocationCreate(BaseModel):
    user_id: Optional[int] = None
    location_type: str  # "home", "office", "college", "other"
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = ""


class UserLocationOut(BaseModel):
    id: int
    user_id: int
    location_type: str
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = ""
    created_at: Optional[str] = None