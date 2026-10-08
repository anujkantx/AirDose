"""Air Quality Index (AQI) Calculation engine.
Follows US EPA breakpoints for PM2.5 concentrations.
All UI categories, labels, recommendations, and presentation styling are handled client-side in frontend.
"""


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
