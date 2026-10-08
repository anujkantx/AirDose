"""User saved place domain entity model."""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class UserLocationModel:
    id: int
    user_id: int
    location_type: str
    name: str
    latitude: float
    longitude: float
    address: str = ""
    radius_meters: float = 50.0
    indoor_coefficient: float = 0.5
    questionnaire_json: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
