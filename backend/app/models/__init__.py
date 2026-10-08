"""Domain models package for AirDose.
Also re-exports schemas for convenient imports across the codebase.
"""

from app.models.user import UserModel
from app.models.location import UserLocationModel
from app.models.exposure import ExposureTickModel

# Re-export Pydantic schemas for seamless compatibility
from app.schemas import (
    SignUpRequest,
    SignInRequest,
    UserOut,
    AuthResponse,
    LocationQuestionnaire,
    UserLocationCreate,
    UserLocationUpdate,
    UserLocationOut,
    TrackLocationRequest,
    CurrentExposureInfo,
    TodayExposureResponse,
    HistoryDataPoint,
    ExposureHistoryResponse,
)

__all__ = [
    "UserModel",
    "UserLocationModel",
    "ExposureTickModel",
    "SignUpRequest",
    "SignInRequest",
    "UserOut",
    "AuthResponse",
    "LocationQuestionnaire",
    "UserLocationCreate",
    "UserLocationUpdate",
    "UserLocationOut",
    "TrackLocationRequest",
    "CurrentExposureInfo",
    "TodayExposureResponse",
    "HistoryDataPoint",
    "ExposureHistoryResponse",
]
