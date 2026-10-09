"""AirDose Application Configuration.
Centralized environment variables, database configuration, and runtime settings.
"""

import os
from typing import List
from dotenv import load_dotenv

# Load .env file from backend directory if present
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Project Metadata
    PROJECT_NAME: str = "AirDose API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Personal Air Pollution Exposure Tracking & Location Intelligence Backend"

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

    # Security & CORS
    CORS_ORIGINS: List[str] = ["*"]

    # External APIs
    OPENAQ_API_KEY: str = os.getenv("OPENAQ_API_KEY", "").strip()

    # Database Configuration
    DB_PATH: str = os.getenv(
        "DB_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "airdose.db"),
    )


settings = Settings()
