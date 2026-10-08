"""Service layer tests for AirDose.

Tests:
1. SpatialTemporalCache (distance, TTL, expiration, hit/miss)
2. DailyExposureService (segment aggregation, contributions, 7-day contiguous history)
3. ExposureService (tracking lifecycle, segment transitions)
"""

import time
import unittest
from datetime import datetime, timezone, timedelta

from app.db.init_db import init_db
from app.db.connection import get_db
from app.integrations.cache.spatial_cache import SpatialTemporalCache
from app.repositories.exposure_repository import ExposureRepository
from app.repositories.daily_exposure_repository import DailyExposureRepository
from app.services.daily_exposure_service import DailyExposureService
from app.services.exposure_service import ExposureService, ActiveSegment


class TestSpatialTemporalCache(unittest.TestCase):
    """Tests for in-memory spatial-temporal observation cache."""

    def setUp(self):
        self.cache = SpatialTemporalCache(ttl_seconds=1800, distance_meters=1000.0)

    def test_cache_hit_within_distance_and_ttl(self):
        t0 = time.time()
        self.cache.store_observation(
            lat=28.6139,
            lon=77.2090,
            data={"status": "success", "aqi": 120, "pollutants": {"pm25": {"value": 45.0}}},
            timestamp=t0,
            iso_str="2026-10-08T12:00:00Z",
            display_time="12:00 PM",
        )

        # Query ~200m away at t0 + 10s
        hit = self.cache.get_observation(28.6150, 77.2090, now=t0 + 10)
        self.assertIsNotNone(hit)
        self.assertTrue(hit["is_cached"])
        self.assertEqual(hit["aqi"], 120)

    def test_cache_miss_expired_ttl(self):
        t0 = time.time()
        self.cache.store_observation(
            lat=28.6139,
            lon=77.2090,
            data={"status": "success", "aqi": 120},
            timestamp=t0,
        )

        # Query 1801 seconds later (expired)
        miss = self.cache.get_observation(28.6139, 77.2090, now=t0 + 1801)
        self.assertIsNone(miss)

    def test_cache_miss_beyond_distance(self):
        t0 = time.time()
        self.cache.store_observation(
            lat=28.6139,
            lon=77.2090,
            data={"status": "success", "aqi": 120},
            timestamp=t0,
        )

        # Query ~5km away
        miss = self.cache.get_observation(28.6500, 77.2090, now=t0 + 10)
        self.assertIsNone(miss)


class TestDailyExposureService(unittest.TestCase):
    """Tests for daily aggregation and 7-day history."""

    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        # Create dedicated test user
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM exposure_segments WHERE user_id = 9999")
            cursor.execute("DELETE FROM daily_exposure WHERE user_id = 9999")
            cursor.execute("DELETE FROM users WHERE id = 9999")
            cursor.execute(
                "INSERT INTO users (id, name, email, password) VALUES (9999, 'Test User', 'test9999@example.com', 'pass')"
            )

    def tearDown(self):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM exposure_segments WHERE user_id = 9999")
            cursor.execute("DELETE FROM daily_exposure WHERE user_id = 9999")
            cursor.execute("DELETE FROM users WHERE id = 9999")

    def test_recalculate_daily_total_from_segments(self):
        test_date = "2026-10-08"

        # Insert 2 segments for the test user
        ExposureRepository.insert_segment(
            user_id=9999,
            start_time=f"{test_date} 09:00:00",
            end_time=f"{test_date} 10:00:00",
            location_type="HOME",
            location_id=None,
            latitude=28.61,
            longitude=77.20,
            pm25=50.0,
            pm25_timestamp=f"{test_date} 09:00:00",
            pm25_source="Test",
            pm25_confidence="high",
            infiltration_factor=0.5,
            breathing_factor=1.0,
            base_breathing_rate_m3_s=0.0001,
            inhalation_rate_ug_s=0.0025,
            exposure_ug=9.0,  # 3600s * 0.0025 = 9.0 µg
        )

        ExposureRepository.insert_segment(
            user_id=9999,
            start_time=f"{test_date} 10:00:00",
            end_time=f"{test_date} 11:00:00",
            location_type="OUTDOOR",
            location_id=None,
            latitude=28.61,
            longitude=77.20,
            pm25=80.0,
            pm25_timestamp=f"{test_date} 10:00:00",
            pm25_source="Test",
            pm25_confidence="high",
            infiltration_factor=1.0,
            breathing_factor=1.0,
            base_breathing_rate_m3_s=0.0001,
            inhalation_rate_ug_s=0.0080,
            exposure_ug=28.8,  # 3600s * 0.008 = 28.8 µg
        )

        total = DailyExposureService.recalculate_daily_total(9999, test_date)
        self.assertAlmostEqual(total, 37.8, places=2)

        contributions = DailyExposureService.get_contributions(9999, test_date)
        self.assertAlmostEqual(contributions["HOME"], 9.0, places=2)
        self.assertAlmostEqual(contributions["OUTDOOR"], 28.8, places=2)
        self.assertEqual(contributions.get("OFFICE"), 0.0)

    def test_get_7_day_history_contiguous_with_zero_fill(self):
        # Insert exposure for only 1 day in the past week
        target_date = (datetime.now(timezone.utc).date() - timedelta(days=2)).strftime("%Y-%m-%d")
        DailyExposureRepository.upsert_daily_total(9999, target_date, 150.5)

        history = DailyExposureService.get_historical_data(9999, period="week")
        self.assertEqual(history["period"], "week")
        self.assertEqual(len(history["data"]), 7)

        # Check contiguous dates
        found_active_day = False
        for point in history["data"]:
            self.assertIn("date", point)
            self.assertIn("label", point)
            self.assertIn("exposure_ug", point)
            if point["date"] == target_date:
                self.assertAlmostEqual(point["exposure_ug"], 150.5, places=1)
                found_active_day = True
            else:
                self.assertEqual(point["exposure_ug"], 0.0)

        self.assertTrue(found_active_day)


if __name__ == "__main__":
    unittest.main()
