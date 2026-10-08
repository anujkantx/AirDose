"""Air Quality Index (AQI) Calculation and Health Categorization.
Follows US EPA breakpoints for PM2.5 and provides standardized health recommendations.
UI styling, colors, and badge classes are managed exclusively on the frontend.
"""

from typing import Dict, Any


def calculate_pm25_aqi(pm25: float) -> int:
    """Calculates AQI from PM2.5 concentration in ug/m3 using US EPA standard breakpoints."""
    if pm25 is None or pm25 < 0:
        return 50
    c = float(pm25)
    if c <= 12.0:
        return int(((50 - 0) / (12.0 - 0.0)) * (c - 0.0) + 0)
    elif c <= 35.4:
        return int(((100 - 51) / (35.4 - 12.1)) * (c - 12.1) + 51)
    elif c <= 55.4:
        return int(((150 - 101) / (55.4 - 35.5)) * (c - 35.5) + 101)
    elif c <= 150.4:
        return int(((200 - 151) / (150.4 - 55.5)) * (c - 55.5) + 151)
    elif c <= 250.4:
        return int(((300 - 201) / (250.4 - 150.5)) * (c - 150.5) + 201)
    elif c <= 350.4:
        return int(((400 - 301) / (350.4 - 250.5)) * (c - 250.5) + 301)
    elif c <= 500.4:
        return int(((500 - 401) / (500.4 - 350.5)) * (c - 350.5) + 401)
    else:
        return 500


def get_aqi_category(aqi: int) -> Dict[str, Any]:
    """Returns classification, health summary, and advisory flags for an AQI value."""
    if aqi <= 50:
        return {
            "level": "Good",
            "category": "Good",
            "description": "Air quality is satisfactory, and air pollution poses little or no risk.",
            "recommendation": "Ideal air quality for outdoor workouts, cycling, and opening windows.",
            "mask_needed": False,
            "purifier_needed": False,
        }
    elif aqi <= 100:
        return {
            "level": "Moderate",
            "category": "Moderate",
            "description": "Air quality is acceptable. However, sensitive individuals may experience minor symptoms.",
            "recommendation": "Unusually sensitive people should consider reducing prolonged outdoor exertion.",
            "mask_needed": False,
            "purifier_needed": False,
        }
    elif aqi <= 150:
        return {
            "level": "Unhealthy for Sensitive Groups",
            "category": "Unhealthy for Sensitive Groups",
            "description": "Members of sensitive groups may experience health effects. The general public is less likely affected.",
            "recommendation": "Children, the elderly, and people with respiratory or heart conditions should limit outdoor activity.",
            "mask_needed": True,
            "purifier_needed": True,
        }
    elif aqi <= 200:
        return {
            "level": "Unhealthy",
            "category": "Unhealthy",
            "description": "Everyone may begin to experience health effects; sensitive groups may experience more serious effects.",
            "recommendation": "Wear an N95 mask outdoors. Keep windows closed and run an air purifier indoors.",
            "mask_needed": True,
            "purifier_needed": True,
        }
    elif aqi <= 300:
        return {
            "level": "Very Unhealthy",
            "category": "Very Unhealthy",
            "description": "Health alert: The risk of health effects is increased for everyone.",
            "recommendation": "Avoid outdoor strenuous activities. Keep indoor air clean with HEPA filtration.",
            "mask_needed": True,
            "purifier_needed": True,
        }
    else:
        return {
            "level": "Hazardous",
            "category": "Hazardous",
            "description": "Health warning of emergency conditions: Everyone is more likely to be affected.",
            "recommendation": "Remain indoors. Avoid all physical outdoor activities and seal entryways.",
            "mask_needed": True,
            "purifier_needed": True,
        }
