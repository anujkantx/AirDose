"""Daily Exposure Service for AirDose.
Manages daily summaries (unique by user_id + date),
ensures segment aggregation consistency, computes location contributions,
and generates historical exposure analytics with direct database CRUD operations.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.db.connection import get_db


# ------------------- CRUD Operations for Daily Exposure & Aggregations -------------------

def get_daily_exposure(user_id: int, date_str: str) -> Optional[Dict[str, Any]]:
    """Retrieves the daily exposure summary row for a user on a given date."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM daily_exposure WHERE user_id = ? AND date = ?",
            (user_id, date_str)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def upsert_daily_exposure(user_id: int, date_str: str, total_pm25_ug: float) -> Dict[str, Any]:
    """Inserts or updates the daily exposure total for a user on a given date."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO daily_exposure (user_id, date, total_pm25_ug)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id, date) DO UPDATE SET
                   total_pm25_ug = excluded.total_pm25_ug,
                   updated_at = CURRENT_TIMESTAMP""",
            (user_id, date_str, float(total_pm25_ug))
        )
        cursor.execute(
            "SELECT * FROM daily_exposure WHERE user_id = ? AND date = ?",
            (user_id, date_str)
        )
        return dict(cursor.fetchone())


def get_daily_exposure_history(
    user_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 30
) -> List[Dict[str, Any]]:
    """Fetches daily exposure history within an optional date range."""
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


def get_location_contributions(user_id: int, date_str: str) -> Dict[str, float]:
    """Calculates exposure contribution by location_type for a given day."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT location_type, SUM(exposure_ug) AS total_exposure
               FROM exposure_segments
               WHERE user_id = ? AND DATE(start_time) = ?
               GROUP BY location_type""",
            (user_id, date_str)
        )
        rows = cursor.fetchall()
        return {row["location_type"]: round(float(row["total_exposure"]), 4) for row in rows}


class DailyExposureService:
    """Handles daily exposure records and historical time-series."""

    @staticmethod
    def get_today_date_str() -> str:
        """Returns current date in YYYY-MM-DD format."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @classmethod
    def get_or_create_today(
        cls, user_id: int, target_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Gets or creates a daily_exposure row for the target date.
        Guarantees that a new day begins at 0 without altering past dates.
        """
        date_str = target_date or cls.get_today_date_str()
        existing = get_daily_exposure(user_id, date_str)
        if existing:
            return existing

        return upsert_daily_exposure(user_id, date_str, 0.0)

    @classmethod
    def recalculate_daily_total(cls, user_id: int, target_date: Optional[str] = None) -> float:
        """Recalculates daily total by aggregating all persisted exposure segments for that day.
        Guarantees that daily summary is strictly synchronized with segment records.
        """
        from app.services.exposure_service import get_exposure_segments_for_day
        date_str = target_date or cls.get_today_date_str()
        segments = get_exposure_segments_for_day(user_id, date_str)
        total_ug = sum(seg.get("exposure_ug", 0.0) for seg in segments)
        total_ug = round(total_ug, 4)

        upsert_daily_exposure(user_id, date_str, total_ug)
        return total_ug

    @classmethod
    def get_contributions(cls, user_id: int, target_date: Optional[str] = None) -> Dict[str, float]:
        """Returns accumulated exposure in ug grouped by location_type for the target date."""
        date_str = target_date or cls.get_today_date_str()
        contributions = get_location_contributions(user_id, date_str)
        # Ensure standard keys exist even if zero
        default_keys = ["HOME", "OFFICE", "OUTDOOR"]
        for k in default_keys:
            if k not in contributions:
                contributions[k] = 0.0
        return contributions

    @classmethod
    def get_historical_data(
        cls,
        user_id: int,
        period: str = "week",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Returns historical exposure trend for day, week, month, or custom date ranges."""
        today = datetime.now(timezone.utc).date()

        if period == "day":
            start_d = today
            end_d = today
        elif period == "month":
            start_d = today - timedelta(days=29)
            end_d = today
        else:  # default "week"
            start_d = today - timedelta(days=6)
            end_d = today

        if start_date:
            try:
                start_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        if end_date:
            try:
                end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        # Query existing database rows
        rows = get_daily_exposure_history(
            user_id,
            start_date=start_d.strftime("%Y-%m-%d"),
            end_date=end_d.strftime("%Y-%m-%d"),
            limit=90,
        )
        row_dict = {r["date"]: round(float(r["total_pm25_ug"]), 2) for r in rows}

        # Build complete contiguous date sequence so charts don't have gaps
        result_points: List[Dict[str, Any]] = []
        curr = start_d
        while curr <= end_d:
            d_str = curr.strftime("%Y-%m-%d")
            day_label = curr.strftime("%a %b %d")
            exposure = row_dict.get(d_str, 0.0)
            result_points.append({
                "date": d_str,
                "label": day_label,
                "exposure_ug": exposure,
            })
            curr += timedelta(days=1)

        return {
            "period": period,
            "start_date": start_d.strftime("%Y-%m-%d"),
            "end_date": end_d.strftime("%Y-%m-%d"),
            "data": result_points,
        }
