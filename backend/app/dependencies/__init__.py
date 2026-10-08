"""FastAPI route dependencies package for AirDose."""

from app.dependencies.auth import get_current_user_id

__all__ = ["get_current_user_id"]
