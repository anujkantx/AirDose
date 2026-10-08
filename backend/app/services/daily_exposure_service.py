"""Daily Exposure Service for AirDose.
Manages daily summaries (unique by user_id + date),
ensures segment aggregation consistency, computes location contributions,
and generates historical exposure analytics.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.database import (
    get_daily_exposure,
    upsert_daily_exposure,
    get_daily_exposure_history,
    get_location_contributions,
    get_exposure_segments_for_day,
)


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
