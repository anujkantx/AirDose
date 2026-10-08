"""FastAPI route dependencies package for AirDose."""

from app.dependencies.auth import get_current_user_id
from app.dependencies.openaq_api import fetch_openaq_air_quality

__all__ = ["get_current_user_id", "fetch_openaq_air_quality"]
