"""Personal PM2.5 Exposure Calculation Engine.

Pure domain logic for calculating:
- Inhalation rate (µg/s) and accumulated exposure (µg).
- Berkeley Earth cigarette equivalence.
- WHO guideline compliance ratio & lung deposition metrics.
- Clean Air Shield (micrograms saved by indoor filtration vs outdoor).
- Trip / commute exposure simulation across transport modes.
"""

from typing import Tuple, Dict, Any, List
from app.core.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
    PM25_CHANGE_ABS_THRESHOLD,
    PM25_CHANGE_REL_THRESHOLD,
    BREATHING_FACTOR_CHANGE_THRESHOLD,
    EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
)

# Medically calibrated dose constants:
# Berkeley Earth: 22 µg/m³ for 24h (~20 µg PM2.5 absorbed) corresponds to ~1 cigarette smoke particulate burden.
UG_PER_CIGARETTE: float = 20.0

# WHO 2021 air quality guideline for PM2.5 is 15 µg/m³ 24h mean.
# For standard resting/active respiration (~8-10 m³/day with 0.5 indoor retention), safe threshold is ~25.0 µg/day.
WHO_DAILY_RECOMMENDED_DOSE_UG: float = 25.0


def calculate_inhalation_rate(
    pm25: float,
    infiltration_factor: float = DEFAULT_INDOOR_FACTOR,
    breathing_factor: float = DEFAULT_BREATHING_FACTOR,
    base_breathing_rate: float = BASE_BREATHING_RATE_M3_S,
) -> float:
    """Calculates instantaneous PM2.5 inhalation rate in micrograms per second (µg/s).

    Formula:
        Inhalation Rate = PM2.5 × Infiltration Factor × Breathing Factor × Base Breathing Rate
    """
    safe_pm25 = max(0.0, float(pm25))
    safe_inf = max(0.0, float(infiltration_factor))
    safe_bf = max(0.1, float(breathing_factor))
    safe_bbr = max(0.0, float(base_breathing_rate))

    return safe_pm25 * safe_inf * safe_bf * safe_bbr


def calculate_exposure_increment(
    inhalation_rate_ug_s: float,
    elapsed_seconds: float,
) -> float:
    """Calculates PM2.5 exposure accumulated over actual elapsed time (µg)."""
    safe_rate = max(0.0, float(inhalation_rate_ug_s))
    safe_time = max(0.0, float(elapsed_seconds))

    return safe_rate * safe_time


def calculate_cigarette_equivalent(total_exposure_ug: float) -> float:
    """Calculates Berkeley Earth cigarette equivalence for PM2.5 dosage."""
    if total_exposure_ug <= 0:
        return 0.0
    return round(float(total_exposure_ug) / UG_PER_CIGARETTE, 2)


def calculate_who_guideline_metrics(total_exposure_ug: float) -> Dict[str, Any]:
    """Calculates compliance metrics relative to the WHO daily PM2.5 benchmark."""
    safe_exposure = max(0.0, float(total_exposure_ug))
    pct = round((safe_exposure / WHO_DAILY_RECOMMENDED_DOSE_UG) * 100.0, 1)

    if pct <= 50.0:
        status = "EXCELLENT"
        message = "Well within WHO clean air guidelines."
    elif pct <= 100.0:
        status = "MODERATE"
        message = "Approaching daily WHO recommended exposure cap."
    elif pct <= 200.0:
        status = "ELEVATED"
        message = "Exceeded WHO daily threshold. Prioritize filtered environments."
    else:
        status = "HAZARDOUS"
        message = "Severe particulate exposure. Wear N95 and use high HEPA filtration."

    return {
        "who_daily_limit_ug": WHO_DAILY_RECOMMENDED_DOSE_UG,
        "percentage_of_who_limit": pct,
        "status": status,
        "message": message,
    }


def simulate_transit_modes(duration_minutes: float, ambient_pm25: float) -> List[Dict[str, Any]]:
    """Simulates particulate inhalation for different commute methods over a given duration.

    Helps users choose clean routes / commute modes.
    """
    elapsed_s = max(1.0, float(duration_minutes) * 60.0)
    pm25 = max(0.0, float(ambient_pm25))

    modes = [
        {"mode": "Walking", "key": "walk", "infiltration": 1.0, "breathing": 2.0, "icon": "Footprints"},
        {"mode": "Cycling", "key": "bike", "infiltration": 1.0, "breathing": 3.2, "icon": "Bike"},
        {"mode": "Car (AC Recirculation)", "key": "car_recirc", "infiltration": 0.20, "breathing": 1.0, "icon": "Car"},
        {"mode": "Car (Windows Open)", "key": "car_open", "infiltration": 0.95, "breathing": 1.1, "icon": "Wind"},
        {"mode": "Metro / AC Train", "key": "metro", "infiltration": 0.35, "breathing": 1.1, "icon": "Train"},
        {"mode": "Public Bus", "key": "bus", "infiltration": 0.70, "breathing": 1.1, "icon": "Bus"},
    ]

    results = []
    for m in modes:
        rate = calculate_inhalation_rate(
            pm25=pm25,
            infiltration_factor=m["infiltration"],
            breathing_factor=m["breathing"],
            base_breathing_rate=BASE_BREATHING_RATE_M3_S,
        )
        dose = calculate_exposure_increment(rate, elapsed_s)
        cigarettes = calculate_cigarette_equivalent(dose)
        results.append({
            "mode": m["mode"],
            "key": m["key"],
            "icon": m["icon"],
            "infiltration_factor": m["infiltration"],
            "breathing_factor": m["breathing"],
            "inhalation_rate_ug_s": round(rate, 6),
            "estimated_dose_ug": round(dose, 2),
            "cigarettes_equivalent": cigarettes,
        })

    results.sort(key=lambda x: x["estimated_dose_ug"])
    return results


def should_close_segment(
    current_location_type: str,
    new_location_type: str,
    current_location_id: int | None,
    new_location_id: int | None,
    current_breathing_factor: float,
    new_breathing_factor: float,
    current_pm25: float,
    new_pm25: float,
    elapsed_since_checkpoint: float,
    checkpoint_interval_seconds: float = EXPOSURE_CHECKPOINT_INTERVAL_SECONDS,
) -> Tuple[bool, str]:
    """Determines whether active exposure segment should be closed and committed."""
    if current_location_type.upper() != new_location_type.upper() or current_location_id != new_location_id:
        return True, "location_changed"

    if abs(current_breathing_factor - new_breathing_factor) > BREATHING_FACTOR_CHANGE_THRESHOLD:
        return True, "breathing_factor_changed"

    pm25_diff = abs(current_pm25 - new_pm25)
    if pm25_diff >= PM25_CHANGE_ABS_THRESHOLD:
        return True, "pm25_abs_threshold_exceeded"

    if current_pm25 > 0 and (pm25_diff / current_pm25) >= PM25_CHANGE_REL_THRESHOLD:
        return True, "pm25_rel_threshold_exceeded"

    if elapsed_since_checkpoint >= checkpoint_interval_seconds:
        return True, "periodic_checkpoint"

    return False, "continue"
