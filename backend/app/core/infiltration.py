"""Scientific Infiltration Modeling Engine for AirDose.

Calculates outdoor pollutant penetration factor (If in [0.10, 1.00])
based on 5 high-signal physical characteristics of indoor micro-environments.
"""

from typing import Optional, Dict, Any


def calculate_infiltration_factor(q: Optional[Dict[str, Any]] = None) -> float:
    """Scientific Infiltration Factor Calculation based on 5 high-signal place characteristics:
    1. Enclosure Level: Solid masonry/concrete baseline vs open
    2. Window/Door Opening Frequency: Air exchange rate
    3. Ventilation Quality & Type: Mechanical HVAC vs natural vs exhaust
    4. Air Conditioning Mode: Recirculation vs Fresh-air intake
    5. Air Purifier: HEPA filtration reduction
    Returns: Infiltration Factor (0.10 to 1.00)
    """
    if not q:
        return 0.50

    # 1. Enclosure Base
    enclosure_map = {
        "fully_enclosed": 0.35,
        "partially_enclosed": 0.55,
        "mostly_open": 0.75,
        "fully_open": 0.95,
    }
    base = enclosure_map.get(str(q.get("enclosure", "fully_enclosed")).lower(), 0.35)

    # 2. Window opening delta
    window_map = {
        "almost_never": 0.00,
        "sometimes": 0.10,
        "frequently": 0.25,
        "usually_open": 0.40,
    }
    w_delta = window_map.get(str(q.get("window_opening", "sometimes")).lower(), 0.10)

    # 3. Ventilation type delta
    vent_map = {
        "mechanical_hvac": -0.10,
        "central_ac": -0.05,
        "mixed": 0.05,
        "exhaust_fan": 0.10,
        "natural": 0.15,
    }
    v_delta = vent_map.get(str(q.get("ventilation_type", "natural")).lower(), 0.15)

    # 4. AC Mode delta
    ac_map = {
        "recirculation": -0.05,
        "no_ac": 0.00,
        "fresh_air_intake": 0.15,
    }
    ac_delta = ac_map.get(str(q.get("ac_usage", "no_ac")).lower(), 0.00)

    # 5. Air Purifier reduction
    purifier_map = {
        "always": 0.35,
        "most_of_time": 0.25,
        "sometimes": 0.12,
        "no_purifier": 0.00,
    }
    p_reduction = purifier_map.get(str(q.get("air_purifier", "no_purifier")).lower(), 0.00)

    total = base + w_delta + v_delta + ac_delta - p_reduction
    return round(max(0.10, min(1.00, total)), 2)
