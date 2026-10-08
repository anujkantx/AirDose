"""Exposure telemetry, tracking ticks, and cumulative inhalation history schemas."""

from pydantic import BaseModel
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
