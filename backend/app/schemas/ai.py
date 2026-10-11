"""Pydantic schemas for Amazon Bedrock AI Exposure Advisor."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ExposureContext(BaseModel):
    """Structured environmental and physiological context for AI reasoning."""
    location: Optional[str] = Field(default="Current Location", description="Human-readable place name or coordinates")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pollutant: str = Field(default="pm25", description="Target pollutant key (e.g. pm25, pm10, no2)")
    concentration: float = Field(default=75.0, ge=0.0, description="Ambient pollutant concentration in µg/m³")
    unit: str = Field(default="µg/m³", description="Measurement unit")
    aqi: Optional[int] = Field(default=None, description="US EPA / CPCB sub-index or Air Quality Index")
    activity: Optional[str] = Field(default="Rest", description="User physical activity: Rest, Walk, Run, Workout")
    duration_minutes: Optional[float] = Field(default=30.0, ge=0.0, description="Activity or exposure duration in minutes")
    breathing_factor: Optional[float] = Field(default=1.0, ge=0.1, description="Breathing rate multiplier (1.0 = rest, 1.8 = walk, 3.5 = run)")
    infiltration_factor: Optional[float] = Field(default=1.0, ge=0.0, le=1.0, description="Micro-environment retention (1.0 outdoor, 0.5 home, 0.2 ac)")
    total_exposure_ug: Optional[float] = Field(default=None, description="Calculated accumulated or estimated inhaled mass in micrograms")
    inhalation_rate_ug_s: Optional[float] = Field(default=None, description="Instantaneous inhalation rate in µg/s")
    cigarettes_equivalent: Optional[float] = Field(default=None, description="Berkeley Earth cigarette equivalence")
    who_percentage: Optional[float] = Field(default=None, description="Percentage of WHO 24-hour recommended limit (25 µg/day)")
    who_status: Optional[str] = Field(default=None, description="WHO compliance status: EXCELLENT, MODERATE, ELEVATED, HAZARDOUS")
    clean_air_shield_saved_ug: Optional[float] = Field(default=None, description="Pollutant mass shielded by indoor filtration vs outdoor")
    data_source: str = Field(default="demo", description="Data provenance: live, cached, fallback, demo")
    observed_at: Optional[str] = Field(default=None, description="Timestamp of sensor reading")


class ChatMessage(BaseModel):
    """User or Assistant message in the conversation thread."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., min_length=1, description="Message text content")


class AdvisorRequest(BaseModel):
    """Request payload for general conversational AI Advisor queries."""
    message: str = Field(..., min_length=1, max_length=2000, description="User question or prompt")
    context: Optional[ExposureContext] = Field(default=None, description="Current AirDose measurement and exposure context")
    conversation_history: Optional[List[ChatMessage]] = Field(default=[], description="Prior messages in the current session")
    hypothetical_activity: Optional[str] = Field(default=None, description="Optional what-if activity scenario")
    hypothetical_duration_minutes: Optional[float] = Field(default=None, ge=1.0, le=1440.0, description="Optional what-if duration scenario")


class AdvisorResponse(BaseModel):
    """Response payload returned by the AI Exposure Advisor."""
    success: bool = True
    answer: str
    model_provider: str = "amazon-bedrock"
    model_id: Optional[str] = None
    data_source: str = "demo"
    calculated_context: Optional[Dict[str, Any]] = None
    error_type: Optional[str] = None
    error_detail: Optional[str] = None


class ExplainExposureRequest(BaseModel):
    """Request to generate a direct scientific breakdown of current exposure without typing a question."""
    context: Optional[ExposureContext] = Field(default=None, description="Verified AirDose exposure numbers to explain")
    user_id: Optional[int] = None


class ExplainExposureResponse(BaseModel):
    """Structured response explaining verified inhalation metrics and health kinetics."""
    success: bool = True
    answer: str
    summary: Optional[str] = None
    breakdown: Optional[List[str]] = None
    actionable_recommendations: Optional[List[str]] = None
    model_provider: str = "amazon-bedrock"
    model_id: Optional[str] = None
    data_source: str = "demo"
    calculated_context: Optional[Dict[str, Any]] = None
    error_type: Optional[str] = None
    error_detail: Optional[str] = None
