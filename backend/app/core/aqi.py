"""Air Quality Index (AQI) Calculation engine.
Follows US EPA standard breakpoints for PM2.5, PM10, NO2, O3, CO, and SO2.
All UI categories, labels, recommendations, and presentation styling are handled client-side in frontend.
"""

from typing import Any, Dict, List, Optional, Tuple


def _linear_aqi(concentration: float, breakpoints: List[Tuple[float, float, int, int]]) -> int:
    """Computes AQI sub-index using piecewise linear interpolation across EPA breakpoints.

    Breakpoints tuple format: (Conc_Low, Conc_High, AQI_Low, AQI_High)
    """
    if concentration is None or concentration < 0:
        return 0

    c = float(concentration)

    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= c <= c_high:
            return int(((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low)

    # If concentration exceeds the highest breakpoint
    if breakpoints:
        last_c_low, last_c_high, last_i_low, last_i_high = breakpoints[-1]
        if c > last_c_high:
            return last_i_high

    return 0


# Breakpoint definitions: (C_low, C_high, I_low, I_high)

PM25_BREAKPOINTS: List[Tuple[float, float, int, int]] = [
    (0.0, 12.0, 0, 50),
    (12.1, 35.4, 51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]

PM10_BREAKPOINTS: List[Tuple[float, float, int, int]] = [
    (0.0, 54.0, 0, 50),
    (55.0, 154.0, 51, 100),
    (155.0, 254.0, 101, 150),
    (255.0, 354.0, 151, 200),
    (355.0, 424.0, 201, 300),
    (425.0, 504.0, 301, 400),
    (505.0, 604.0, 401, 500),
]

NO2_BREAKPOINTS: List[Tuple[float, float, int, int]] = [
    (0.0, 53.0, 0, 50),
    (54.0, 100.0, 51, 100),
    (101.0, 360.0, 101, 150),
    (361.0, 649.0, 151, 200),
    (650.0, 1249.0, 201, 300),
    (1250.0, 1649.0, 301, 400),
    (1650.0, 2049.0, 401, 500),
]

O3_BREAKPOINTS: List[Tuple[float, float, int, int]] = [
    (0.0, 54.0, 0, 50),
    (55.0, 70.0, 51, 100),
    (71.0, 85.0, 101, 150),
    (86.0, 105.0, 151, 200),
    (106.0, 200.0, 201, 300),
    (201.0, 400.0, 301, 400),
    (401.0, 504.0, 401, 500),
]

CO_BREAKPOINTS: List[Tuple[float, float, int, int]] = [
    (0.0, 4.4, 0, 50),
    (4.5, 9.4, 51, 100),
    (9.5, 12.4, 101, 150),
    (12.5, 15.4, 151, 200),
    (15.5, 30.4, 201, 300),
    (30.5, 40.4, 301, 400),
    (40.5, 50.4, 401, 500),
]

SO2_BREAKPOINTS: List[Tuple[float, float, int, int]] = [
    (0.0, 35.0, 0, 50),
    (36.0, 75.0, 51, 100),
    (76.0, 185.0, 101, 150),
    (186.0, 304.0, 151, 200),
    (305.0, 604.0, 201, 300),
    (605.0, 804.0, 301, 400),
    (805.0, 1004.0, 401, 500),
]


def calculate_pm25_aqi(pm25: float) -> int:
    """Calculates AQI from PM2.5 concentration in ug/m3 using EPA breakpoints."""
    return _linear_aqi(pm25, PM25_BREAKPOINTS)


def calculate_pm10_aqi(pm10: float) -> int:
    """Calculates AQI from PM10 concentration in ug/m3 using EPA breakpoints."""
    return _linear_aqi(pm10, PM10_BREAKPOINTS)


def calculate_no2_aqi(no2: float) -> int:
    """Calculates AQI from NO2 concentration in ppb/ug/m3 using EPA breakpoints."""
    return _linear_aqi(no2, NO2_BREAKPOINTS)


def calculate_o3_aqi(o3: float) -> int:
    """Calculates AQI from O3 concentration in ppb/ug/m3 using EPA breakpoints."""
    return _linear_aqi(o3, O3_BREAKPOINTS)


def calculate_co_aqi(co: float, unit: Optional[str] = None) -> int:
    """Calculates AQI from CO concentration. Auto-normalizes ug/m3 to mg/m3 (or ppm)."""
    if co is None or co < 0:
        return 0

    val = float(co)
    # If reported in ug/m3 or raw value is in thousands, convert to mg/m3 (e.g. 2800 ug/m3 -> 2.8 mg/m3)
    if (unit and "ug" in unit.lower()) or (unit and "µg" in unit.lower()) or val > 60.0:
        val = val / 1000.0

    return _linear_aqi(val, CO_BREAKPOINTS)


def calculate_so2_aqi(so2: float) -> int:
    """Calculates AQI from SO2 concentration in ppb/ug/m3 using EPA breakpoints."""
    return _linear_aqi(so2, SO2_BREAKPOINTS)


def calculate_aqi(pollutants: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate AQI from available pollutant concentrations.

    Prefer PM2.5 as the primary AQI pollutant.
    If multiple pollutants have valid AQI calculations,
    the highest pollutant-specific AQI becomes the overall AQI.
    """
    pollutant_aqis: Dict[str, int] = {}

    if pollutants.get("pm25") and pollutants["pm25"].get("value") is not None:
        value = pollutants["pm25"]["value"]
        pollutant_aqis["pm25"] = calculate_pm25_aqi(value)

    if pollutants.get("pm10") and pollutants["pm10"].get("value") is not None:
        value = pollutants["pm10"]["value"]
        pollutant_aqis["pm10"] = calculate_pm10_aqi(value)

    if pollutants.get("no2") and pollutants["no2"].get("value") is not None:
        value = pollutants["no2"]["value"]
        pollutant_aqis["no2"] = calculate_no2_aqi(value)

    if pollutants.get("o3") and pollutants["o3"].get("value") is not None:
        value = pollutants["o3"]["value"]
        pollutant_aqis["o3"] = calculate_o3_aqi(value)

    if pollutants.get("co") and pollutants["co"].get("value") is not None:
        value = pollutants["co"]["value"]
        unit = pollutants["co"].get("unit")
        pollutant_aqis["co"] = calculate_co_aqi(value, unit=unit)

    if pollutants.get("so2") and pollutants["so2"].get("value") is not None:
        value = pollutants["so2"]["value"]
        pollutant_aqis["so2"] = calculate_so2_aqi(value)

    if not pollutant_aqis:
        return {
            "aqi": None,
            "dominant_pollutant": None,
            "pollutant_aqis": {},
        }

    dominant_pollutant = max(
        pollutant_aqis,
        key=pollutant_aqis.get,
    )

    return {
        "aqi": pollutant_aqis[dominant_pollutant],
        "dominant_pollutant": dominant_pollutant,
        "pollutant_aqis": pollutant_aqis,
    }
