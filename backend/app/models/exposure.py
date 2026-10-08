"""Exposure tick & daily summary domain models."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ExposureTickModel:
    id: Optional[int] = None
    user_id: int = 1
    timestamp: float = 0.0
    latitude: float = 0.0
    longitude: float = 0.0
    environment: str = "outdoor"
    location_id: Optional[int] = None
    pm25: float = 0.0
    infiltration_factor: float = 1.0
    breathing_factor: float = 1.0
    exposure_increment_ug: float = 0.0
    duration_seconds: float = 0.0
