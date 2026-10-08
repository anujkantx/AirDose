"""Daily Exposure Service for AirDose.

Responsibilities:
- Canonical daily aggregation from exposure_segments into daily_exposure table.
- Location-based exposure contribution analytics.
- Clean Air Shield calculation (micrograms saved by indoor filtration vs outdoor).
- Generating contiguous 7-day (or custom range) historical exposure analytics for charts.
- Zero business logic mixed in repositories or routes.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from app.repositories.daily_exposure_repository import (
    DailyExposureRepository,
    get_daily_exposure,
    upsert_daily_exposure,
    get_daily_exposure_history,
)
from app.repositories.exposure_repository import (
    ExposureRepository,
    get_exposure_segments_for_day,
    get_location_contributions,
)


class DailyExposureService:
    """Handles daily exposure records and historical time-series."""

    @staticmethod
    def get_today_date_str() -> str:
        """Returns current date in YYYY-MM-DD UTC format."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @classmethod
    def get_or_create_today(
        cls, user_id: int, target_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Gets or creates a daily_exposure row for the target date."""
        date_str = target_date or cls.get_today_date_str()
        existing = DailyExposureRepository.get_by_user_and_date(user_id, date_str)
        if existing:
            return existing

        return DailyExposureRepository.upsert_daily_total(user_id, date_str, 0.0)

    @classmethod
    def recalculate_daily_total(cls, user_id: int, target_date: Optional[str] = None) -> float:
        """Canonical aggregation path:
        Aggregates all persisted exposure segments for the day into daily_exposure table.
        Single source of truth: exposure_segments.
        """
        date_str = target_date or cls.get_today_date_str()
        segments = ExposureRepository.get_segments_by_user_and_date(user_id, date_str)
        total_ug = sum(float(seg.get("exposure_ug", 0.0)) for seg in segments)
        total_ug = round(total_ug, 4)

        DailyExposureRepository.upsert_daily_total(user_id, date_str, total_ug)
        return total_ug

    @classmethod
    def get_contributions(cls, user_id: int, target_date: Optional[str] = None) -> Dict[str, float]:
        """Returns accumulated exposure in µg grouped by location_type for the target date."""
        date_str = target_date or cls.get_today_date_str()
        contributions = ExposureRepository.get_location_contributions(user_id, date_str)

        # Ensure standard baseline environments exist
        default_keys = ["HOME", "OFFICE", "OUTDOOR"]
        for k in default_keys:
            if k not in contributions:
                contributions[k] = 0.0
        return contributions

    @classmethod
    def get_clean_air_shield_savings(cls, user_id: int, target_date: Optional[str] = None) -> float:
        """Calculates total PM2.5 particulate mass (µg) shielded by indoor micro-environments.

        If a user stayed indoors with an infiltration factor of 0.50 and inhaled 10 µg,
        the outdoor unfiltered exposure would have been 20 µg, yielding 10 µg saved.
        """
        date_str = target_date or cls.get_today_date_str()
        segments = ExposureRepository.get_segments_by_user_and_date(user_id, date_str)
        total_saved_ug = 0.0

        for seg in segments:
            inf = float(seg.get("infiltration_factor") or 1.0)
            exp = float(seg.get("exposure_ug") or 0.0)
            if 0.0 < inf < 1.0 and exp > 0.0:
                potential_outdoor = exp / inf
                total_saved_ug += (potential_outdoor - exp)

        return round(total_saved_ug, 2)

    @classmethod
    def get_historical_data(
        cls,
        user_id: int,
        period: str = "week",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Returns historical personal exposure trend.

        Guarantees:
        - Exactly contiguous dates for the requested period (7 days for 'week').
        - Missing days are explicitly populated with 0.0 µg exposure so charts never gap.
        - Preserves real historical data without synthesizing fake values.
        """
        today = datetime.now(timezone.utc).date()

        if period == "day":
            start_d = today
            end_d = today
        elif period == "month":
            start_d = today - timedelta(days=29)
            end_d = today
        else:  # default "week" -> exactly 7 contiguous days
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

        # Query existing database records
        rows = DailyExposureRepository.get_history_range(
            user_id,
            start_date=start_d.strftime("%Y-%m-%d"),
            end_date=end_d.strftime("%Y-%m-%d"),
            limit=90,
        )
        row_dict = {r["date"]: round(float(r["total_pm25_ug"]), 2) for r in rows}

        # Build contiguous date series
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
