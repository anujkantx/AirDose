"""OpenAQ v3 API Network Client.

Handles HTTP communication with the official OpenAQ v3 API.
Zero business logic or exposure calculations.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.constants import (
    OPENAQ_BASE_URL,
    OPENAQ_SEARCH_RADIUS_METERS,
    OPENAQ_LOCATIONS_LIMIT,
    OPENAQ_HTTP_TIMEOUT_SECONDS,
    OPENAQ_SENSOR_TIMEOUT_SECONDS,
)


class OpenAQClient:
    """Async HTTP Client for OpenAQ v3 API."""

    def __init__(self, api_key: Optional[str] = None, base_url: str = OPENAQ_BASE_URL):
        self._api_key = (api_key if api_key is not None else settings.OPENAQ_API_KEY).strip()
        self._base_url = base_url.rstrip("/")

    @property
    def has_api_key(self) -> bool:
        return bool(self._api_key or settings.OPENAQ_API_KEY)

    def get_headers(self) -> Dict[str, str]:
        key = (settings.OPENAQ_API_KEY or self._api_key).strip()
        return {"X-API-Key": key} if key else {}

    async def fetch_candidate_locations(
        self,
        lat: float,
        lon: float,
        radius: int = OPENAQ_SEARCH_RADIUS_METERS,
        limit: int = OPENAQ_LOCATIONS_LIMIT,
        client: Optional[httpx.AsyncClient] = None,
    ) -> List[Dict[str, Any]]:
        """Queries OpenAQ v3 /locations endpoint for candidate stations within radius."""
        headers = self.get_headers()
        if not headers:
            return []

        should_close = False
        if client is None:
            client = httpx.AsyncClient(timeout=OPENAQ_HTTP_TIMEOUT_SECONDS)
            should_close = True

        try:
            response = await client.get(
                f"{self._base_url}/locations",
                headers=headers,
                params={
                    "coordinates": f"{lat},{lon}",
                    "radius": radius,
                    "limit": limit,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results") or []
        except Exception as exc:
            print(f"[OpenAQClient] Failed to fetch locations: {exc}")
            return []
        finally:
            if should_close:
                await client.aclose()

    async def fetch_sensor_latest_measurement(
        self,
        sensor_id: int,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[Dict[str, Any]]:
        """Fetches latest hourly measurement record for a specific sensor ID."""
        headers = self.get_headers()
        if not headers or not sensor_id:
            return None

        should_close = False
        if client is None:
            client = httpx.AsyncClient(timeout=OPENAQ_SENSOR_TIMEOUT_SECONDS)
            should_close = True

        try:
            response = await client.get(
                f"{self._base_url}/sensors/{sensor_id}/hours",
                headers=headers,
                params={"limit": 1},
            )
            response.raise_for_status()
            results = response.json().get("results") or []
            return results[0] if results else None
        except Exception:
            return None
        finally:
            if should_close:
                await client.aclose()


# Singleton OpenAQ client instance
openaq_client = OpenAQClient()
