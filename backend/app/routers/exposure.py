"""Exposure tracking router for AirDose.
Provides endpoints for:
- Today's cumulative exposure and live inhalation state
- Current active segment tracking state (for smooth resumption on refresh)
- Ingesting periodic GPS location checkpoints
- Stopping exposure tracking safely
- Historical daily exposure analytics
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models import (
    TodayExposureResponse,
    CurrentExposureInfo,
    ExposureHistoryResponse,
    TrackLocationRequest,
)
from app.auth_deps import get_current_user_id
from app.services.exposure_service import exposure_service
from app.services.daily_exposure_service import DailyExposureService
from app.services.air_quality_service import air_quality_service
from app.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
)

router = APIRouter(prefix="/api/exposure", tags=["Personal PM2.5 Exposure"])


@router.get("/today", response_model=TodayExposureResponse)
def get_today_exposure(
    user_id: int = Depends(get_current_user_id),
):
    """Returns today's total accumulated PM2.5 exposure (persisted + active),
    current inhalation rate, environment parameters, and location contribution breakdown.
    """
    date_str = DailyExposureService.get_today_date_str()
    # 1. Base persisted daily total
    daily_row = DailyExposureService.get_or_create_today(user_id, date_str)
    persisted_total = float(daily_row.get("total_pm25_ug") or 0.0)

    # 2. Get active in-memory tracking state if ongoing
    active_state = exposure_service.get_current_state(user_id)
    active_added = 0.0
    current_info: Optional[CurrentExposureInfo] = None
    is_tracking = False

    # 3. Base contributions from persisted segments
    contributions = DailyExposureService.get_contributions(user_id, date_str)

    if active_state:
        is_tracking = True
        active_added = active_state.get("accumulated_exposure_ug", 0.0)

        # Merge active exposure into the corresponding location contribution
        active_env = active_state.get("location_type", "OUTDOOR")
        contributions[active_env] = round(contributions.get(active_env, 0.0) + active_added, 4)

        # Freshness and cache details of pollution data
        cached_reading = air_quality_service.get_cached_pm25()
        age_seconds = cached_reading.get("cache_age_seconds", 0) if cached_reading else 0

        current_info = CurrentExposureInfo(
            pm25=active_state["pm25"],
            environment=active_state["location_type"],
            location_id=active_state.get("location_id"),
            location_name=active_state.get("location_name"),
            infiltration_factor=active_state["infiltration_factor"],
            breathing_factor=active_state["breathing_factor"],
            base_breathing_rate_m3_s=active_state["base_breathing_rate_m3_s"],
            inhalation_rate_ug_s=active_state["inhalation_rate_ug_s"],
            last_pollution_updated_seconds_ago=age_seconds,
            is_cached=cached_reading.get("is_cached", False) if cached_reading else False,
            cache_expires_in_seconds=cached_reading.get("cache_expires_in_seconds", 1800) if cached_reading else 1800,
            cache_distance_meters=cached_reading.get("cache_distance_meters", 0.0) if cached_reading else 0.0,
            cached_at=cached_reading.get("cached_at") if cached_reading else None,
            cached_at_display=cached_reading.get("cached_at_display") if cached_reading else None,
        )
    else:
        # Fallback reading when tracking is not actively running
        cached_reading = air_quality_service.get_cached_pm25()
        if cached_reading:
            current_info = CurrentExposureInfo(
                pm25=cached_reading["pm25"],
                environment="OUTDOOR",
                location_id=None,
                location_name="Outdoor Environment",
                infiltration_factor=OUTDOOR_FACTOR,
                breathing_factor=DEFAULT_BREATHING_FACTOR,
                base_breathing_rate_m3_s=BASE_BREATHING_RATE_M3_S,
                inhalation_rate_ug_s=round(
                    cached_reading["pm25"] * OUTDOOR_FACTOR * DEFAULT_BREATHING_FACTOR * BASE_BREATHING_RATE_M3_S, 6
                ),
                last_pollution_updated_seconds_ago=cached_reading.get("cache_age_seconds", 0),
                is_cached=cached_reading.get("is_cached", False),
                cache_expires_in_seconds=cached_reading.get("cache_expires_in_seconds", 1800),
                cache_distance_meters=cached_reading.get("cache_distance_meters", 0.0),
                cached_at=cached_reading.get("cached_at"),
                cached_at_display=cached_reading.get("cached_at_display"),
            )

    total_exposure = round(persisted_total + active_added, 4)

    return TodayExposureResponse(
        date=date_str,
        total_exposure_ug=total_exposure,
        current=current_info,
        contributions=contributions,
        tracking=is_tracking,
    )


@router.get("/current")
def get_current_tracking_state(
    user_id: int = Depends(get_current_user_id),
):
    """Returns the user's active segment tracking state.
    Used by the frontend to resume live exposure accumulation on page refresh.
    """
    state = exposure_service.get_current_state(user_id)
    return {
        "tracking": state is not None,
        "state": state,
    }


@router.post("/track")
async def track_location_tick(
    payload: TrackLocationRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Processes a location checkpoint tick:
    - Resolves environment using saved locations + hysteresis
    - Checks whether to refresh PM2.5 (1km or 30m)
    - Starts or accumulates current exposure segment
    - Automatically closes & commits segment at checkpoints or transitions
    """
    breathing = payload.breathing_factor if payload.breathing_factor and payload.breathing_factor > 0 else DEFAULT_BREATHING_FACTOR

    state = await exposure_service.process_tracking_update(
        user_id=user_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        speed=payload.speed,
        heading=payload.heading,
        breathing_factor=breathing,
        client_timestamp=payload.client_timestamp,
    )

    # Also compute today's live total
    date_str = DailyExposureService.get_today_date_str()
    daily_row = DailyExposureService.get_or_create_today(user_id, date_str)
    persisted_total = float(daily_row.get("total_pm25_ug") or 0.0)
    total_live = round(persisted_total + state["accumulated_exposure_ug"], 4)

    return {
        "status": "success",
        "state": state,
        "total_exposure_ug": total_live,
    }


@router.post("/stop")
def stop_tracking(
    user_id: int = Depends(get_current_user_id),
):
    """Stops exposure tracking, persists the final segment, and updates daily totals."""
    result = exposure_service.stop_tracking(user_id)
    return result


@router.get("/history", response_model=ExposureHistoryResponse)
def get_exposure_history(
    period: str = Query("week", description="day | week | month | custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    user_id: int = Depends(get_current_user_id),
):
    """Returns daily historical exposure data for chart visualizations."""
    history_data = DailyExposureService.get_historical_data(
        user_id=user_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )
    return ExposureHistoryResponse(
        period=history_data["period"],
        start_date=history_data["start_date"],
        end_date=history_data["end_date"],
        data=history_data["data"],
    )
