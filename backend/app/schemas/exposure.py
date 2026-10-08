"""Exposure telemetry, tracking ticks, and cumulative inhalation history schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


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
    aqi: Optional[int] = None
    observed_at: Optional[str] = None


class TodayExposureResponse(BaseModel):
    date: str
    total_exposure_ug: float
    current: Optional[CurrentExposureInfo] = None
    contributions: Dict[str, float]
    tracking: bool = False
    cigarettes_equivalent: float = 0.0
    who_percentage: float = 0.0
    who_status: str = "EXCELLENT"
    clean_air_shield_saved_ug: float = 0.0


class HistoryDataPoint(BaseModel):
    date: str
    label: str
    exposure_ug: float


class ExposureHistoryResponse(BaseModel):
    period: str
    start_date: str
    end_date: str
    data: List[HistoryDataPoint]


class TripSimulationRequest(BaseModel):
    duration_minutes: float = Field(default=30.0, ge=1.0, le=360.0)
    ambient_pm25: float = Field(default=80.0, ge=0.0, le=1000.0)


class TransitModeSimulation(BaseModel):
    mode: str
    key: str
    icon: str
    infiltration_factor: float
    breathing_factor: float
    inhalation_rate_ug_s: float
    estimated_dose_ug: float
    cigarettes_equivalent: float


class TripSimulationResponse(BaseModel):
    duration_minutes: float
    ambient_pm25: float
    options: List[TransitModeSimulation]
    safest_mode: str
    max_dose_savings_ug: float
