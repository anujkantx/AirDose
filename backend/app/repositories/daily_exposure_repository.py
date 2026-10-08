"""Daily Exposure Database Repository.

Pure data access layer for daily aggregate exposure records.
Zero HTTP or business logic.
"""

from typing import Dict, Any, Optional, List
from app.db.connection import get_db


class DailyExposureRepository:
    """Repository for daily summary exposure data."""

    @staticmethod
    def get_by_user_and_date(user_id: int, date_str: str) -> Optional[Dict[str, Any]]:
        """Retrieves the daily exposure summary row for a user on a given date."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM daily_exposure WHERE user_id = ? AND date = ?",
                (user_id, date_str),
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def upsert_daily_total(user_id: int, date_str: str, total_pm25_ug: float) -> Dict[str, Any]:
        """Inserts or updates daily exposure total for a user on a given date."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO daily_exposure (user_id, date, total_pm25_ug)
                   VALUES (?, ?, ?)
                   ON CONFLICT(user_id, date) DO UPDATE SET
                       total_pm25_ug = excluded.total_pm25_ug,
                       updated_at = CURRENT_TIMESTAMP""",
                (user_id, date_str, float(total_pm25_ug)),
            )
            cursor.execute(
                "SELECT * FROM daily_exposure WHERE user_id = ? AND date = ?",
                (user_id, date_str),
            )
            return dict(cursor.fetchone())

    @staticmethod
    def get_history_range(
        user_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 90,
    ) -> List[Dict[str, Any]]:
        """Fetches daily exposure rows within a date range."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT date, total_pm25_ug FROM daily_exposure WHERE user_id = ?"
            params: List[Any] = [user_id]
            if start_date:
                query += " AND date >= ?"
                params.append(start_date)
            if end_date:
                query += " AND date <= ?"
                params.append(end_date)
            query += " ORDER BY date ASC LIMIT ?"
            params.append(limit)
            cursor.execute(query, tuple(params))
            return [dict(row) for row in cursor.fetchall()]


# Functional aliases
get_daily_exposure = DailyExposureRepository.get_by_user_and_date
upsert_daily_exposure = DailyExposureRepository.upsert_daily_total
get_daily_exposure_history = DailyExposureRepository.get_history_range
