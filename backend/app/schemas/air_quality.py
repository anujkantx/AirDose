"""Air Quality response and pollutant detail schemas."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class PollutantDetail(BaseModel):
    value: Optional[float] = None
    unit: str = "µg/m³"
    label: str = ""
    status: Optional[str] = None
    time: Optional[str] = None
    observed_at: Optional[str] = None
    sensor_id: Optional[int] = None


class StationInfo(BaseModel):
    id: Optional[int] = None
    name: str = "Local Air Monitor"
    distance_km: float = 0.0
    provider: str = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_updated: Optional[str] = None
    selection_score: Optional[float] = None
    confidence: Optional[str] = "medium"
    score_breakdown: Optional[Dict[str, float]] = None
    selection_reason: Optional[Dict[str, Any]] = None


class DataQualityInfo(BaseModel):
    source: str = "OpenAQ"
    observed_at: Optional[str] = None
    fetched_at: Optional[str] = None
    is_cached: bool = False
    status: str = "LIVE"  # LIVE, CACHED, STALE, FALLBACK, DEMO, UNAVAILABLE


class AirQualityResponse(BaseModel):
    status: str = "success"
    source: str = "OpenAQ"
    coordinates: Dict[str, float]
    aqi: Optional[int] = None
    dominant_pollutant: Optional[str] = None
    dominant_pollutant_key: Optional[str] = None
    pollutant_aqis: Dict[str, int] = Field(default_factory=dict)
    pollutants: Dict[str, PollutantDetail] = Field(default_factory=dict)
    station: Optional[StationInfo] = None
    data_quality: Optional[DataQualityInfo] = None
    fetched_at: str = ""
    fetched_at_display: Optional[str] = None
    is_cached: bool = False
    cache_age_seconds: int = 0
    cache_expires_in_seconds: int = 1800
    cache_distance_meters: float = 0.0
    cache_anchor_lat: Optional[float] = None
    cache_anchor_lon: Optional[float] = None
    cached_at: Optional[str] = None
    cached_at_display: Optional[str] = None
