"""Unit tests for AirDose core calculation engines and algorithms.

Tests:
1. Exposure & inhalation rate calculations
2. EPA AQI calculations & dominant pollutant
3. Infiltration factor calculations
4. Haversine distance calculations
5. Station suitability scoring & ranking
6. Micro-environment resolution with hysteresis debouncing
"""

import math
import unittest
from datetime import datetime, timezone, timedelta

from app.core.exposure import (
    calculate_inhalation_rate,
    calculate_exposure_increment,
    should_close_segment,
)
from app.core.aqi import (
    calculate_pm25_aqi,
    calculate_pm10_aqi,
    calculate_no2_aqi,
    calculate_o3_aqi,
    calculate_co_aqi,
    calculate_so2_aqi,
    calculate_aqi,
)
from app.core.infiltration import calculate_infiltration_factor
from app.core.haversine import haversine_distance
from app.core.station_selector import (
    calculate_distance_score,
    calculate_freshness_score,
    calculate_sensor_score,
    score_station,
    select_best_station_for_location,
)
from app.core.location_resolver import resolve_user_environment
from app.core.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
)


class TestExposureCore(unittest.TestCase):
    """Tests for personal PM2.5 inhalation and exposure dose calculation."""

    def test_inhalation_rate_zero_pm25(self):
        rate = calculate_inhalation_rate(
            pm25=0.0,
            infiltration_factor=0.5,
            breathing_factor=1.0,
            base_breathing_rate=0.0001,
        )
        self.assertEqual(rate, 0.0)

    def test_inhalation_rate_nominal(self):
        # 50 µg/m³ * 0.5 (infiltration) * 1.0 (breathing) * 0.0001 m³/s = 0.0025 µg/s
        rate = calculate_inhalation_rate(
            pm25=50.0,
            infiltration_factor=0.5,
            breathing_factor=1.0,
            base_breathing_rate=0.0001,
        )
        self.assertAlmostEqual(rate, 0.0025, places=6)

    def test_inhalation_rate_different_factors(self):
        # Outdoor (1.0) with high exertion (2.5) in 100 µg/m³ PM2.5
        # 100 * 1.0 * 2.5 * 0.0001 = 0.025 µg/s
        rate = calculate_inhalation_rate(
            pm25=100.0,
            infiltration_factor=1.0,
            breathing_factor=2.5,
            base_breathing_rate=0.0001,
        )
        self.assertAlmostEqual(rate, 0.025, places=6)

    def test_exposure_increment_time_integration(self):
        inhalation_rate = 0.005  # µg/s
        # 10 seconds: 0.005 * 10 = 0.05 µg
        self.assertAlmostEqual(calculate_exposure_increment(inhalation_rate, 10.0), 0.05, places=6)

        # 300 seconds (5 min checkpoint): 0.005 * 300 = 1.5 µg
        self.assertAlmostEqual(calculate_exposure_increment(inhalation_rate, 300.0), 1.5, places=6)

        # 3600 seconds (1 hour): 0.005 * 3600 = 18.0 µg
        self.assertAlmostEqual(calculate_exposure_increment(inhalation_rate, 3600.0), 18.0, places=6)

    def test_should_close_segment_rules(self):
        # 1. Location changed
        close, reason = should_close_segment(
            current_location_type="HOME",
            new_location_type="OUTDOOR",
            current_location_id=1,
            new_location_id=None,
            current_breathing_factor=1.0,
            new_breathing_factor=1.0,
            current_pm25=50.0,
            new_pm25=50.0,
            elapsed_since_checkpoint=60.0,
        )
        self.assertTrue(close)
        self.assertEqual(reason, "location_changed")

        # 2. Breathing factor changed
        close, reason = should_close_segment(
            current_location_type="HOME",
            new_location_type="HOME",
            current_location_id=1,
            new_location_id=1,
            current_breathing_factor=1.0,
            new_breathing_factor=2.0,
            current_pm25=50.0,
            new_pm25=50.0,
            elapsed_since_checkpoint=60.0,
        )
        self.assertTrue(close)
        self.assertEqual(reason, "breathing_factor_changed")

        # 3. PM2.5 jumped significantly (> 10 ug/m3)
        close, reason = should_close_segment(
            current_location_type="HOME",
            new_location_type="HOME",
            current_location_id=1,
            new_location_id=1,
            current_breathing_factor=1.0,
            new_breathing_factor=1.0,
            current_pm25=50.0,
            new_pm25=65.0,
            elapsed_since_checkpoint=60.0,
        )
        self.assertTrue(close)
        self.assertEqual(reason, "pm25_abs_threshold_exceeded")

        # 4. Periodic checkpoint reached (>= 300s)
        close, reason = should_close_segment(
            current_location_type="HOME",
            new_location_type="HOME",
            current_location_id=1,
            new_location_id=1,
            current_breathing_factor=1.0,
            new_breathing_factor=1.0,
            current_pm25=50.0,
            new_pm25=51.0,
            elapsed_since_checkpoint=305.0,
            checkpoint_interval_seconds=300.0,
        )
        self.assertTrue(close)
        self.assertEqual(reason, "periodic_checkpoint")

        # 5. Stable condition -> continue
        close, reason = should_close_segment(
            current_location_type="HOME",
            new_location_type="HOME",
            current_location_id=1,
            new_location_id=1,
            current_breathing_factor=1.0,
            new_breathing_factor=1.0,
            current_pm25=50.0,
            new_pm25=51.0,
            elapsed_since_checkpoint=60.0,
            checkpoint_interval_seconds=300.0,
        )
        self.assertFalse(close)
        self.assertEqual(reason, "continue")


class TestAQICore(unittest.TestCase):
    """Tests for EPA AQI breakpoints and calculations."""

    def test_pm25_aqi_breakpoints(self):
        # 0.0 -> 0 AQI
        self.assertEqual(calculate_pm25_aqi(0.0), 0)
        # 12.0 -> 50 AQI (Good upper bound)
        self.assertEqual(calculate_pm25_aqi(12.0), 50)
        # 35.4 -> 100 AQI (Moderate upper bound)
        self.assertEqual(calculate_pm25_aqi(35.4), 100)
        # 55.4 -> 150 AQI (USG upper bound)
        self.assertEqual(calculate_pm25_aqi(55.4), 150)
        # 150.4 -> 200 AQI (Unhealthy upper bound)
        self.assertEqual(calculate_pm25_aqi(150.4), 200)

    def test_composite_aqi_dominant_pollutant(self):
        pollutants = {
            "pm25": {"value": 85.0},  # ~166 AQI
            "pm10": {"value": 60.0},  # ~53 AQI
            "no2": {"value": 40.0},   # ~37 AQI
        }
        res = calculate_aqi(pollutants)
        self.assertEqual(res["dominant_pollutant"], "pm25")
        self.assertGreater(res["aqi"], 150)


class TestInfiltrationCore(unittest.TestCase):
    """Tests for micro-environment infiltration factor modeling."""

    def test_default_infiltration(self):
        self.assertEqual(calculate_infiltration_factor(None), 0.50)

    def test_custom_questionnaire(self):
        # Fully enclosed + almost never open + mechanical HVAC + recirculation + always purifier
        # 0.35 + 0.0 - 0.10 - 0.05 - 0.35 = -0.15 -> clamped to min 0.10
        q = {
            "enclosure": "fully_enclosed",
            "window_opening": "almost_never",
            "ventilation_type": "mechanical_hvac",
            "ac_usage": "recirculation",
            "air_purifier": "always",
        }
        factor = calculate_infiltration_factor(q)
        self.assertEqual(factor, 0.10)

        # Fully open + usually open + natural + fresh_air_intake + no_purifier
        # 0.95 + 0.40 + 0.15 + 0.15 - 0.00 = 1.65 -> clamped to max 1.00
        q_open = {
            "enclosure": "fully_open",
            "window_opening": "usually_open",
            "ventilation_type": "natural",
            "ac_usage": "fresh_air_intake",
            "air_purifier": "no_purifier",
        }
        factor_open = calculate_infiltration_factor(q_open)
        self.assertEqual(factor_open, 1.00)


class TestLocationResolverCore(unittest.TestCase):
    """Tests for geofence matching and hysteresis debouncing."""

    def setUp(self):
        self.places = [
            {
                "id": 1,
                "location_type": "home",
                "name": "Home",
                "latitude": 28.6139,
                "longitude": 77.2090,
                "radius_meters": 100.0,
                "indoor_coefficient": 0.55,
            },
            {
                "id": 2,
                "location_type": "office",
                "name": "Office",
                "latitude": 28.4595,
                "longitude": 77.0266,
                "radius_meters": 150.0,
                "indoor_coefficient": 0.40,
            },
        ]

    def test_inside_home_geofence(self):
        # Exactly at home coordinates
        env, outside_count = resolve_user_environment(
            lat=28.6139,
            lon=77.2090,
            saved_places=self.places,
        )
        self.assertEqual(env["environment"], "HOME")
        self.assertEqual(env["location_id"], 1)
        self.assertEqual(env["infiltration_factor"], 0.55)
        self.assertTrue(env["is_inside_saved_place"])

    def test_outside_all_geofences(self):
        # Far outside both (e.g. lat 28.5000, lon 77.1000)
        env, outside_count = resolve_user_environment(
            lat=28.5000,
            lon=77.1000,
            saved_places=self.places,
        )
        self.assertEqual(env["environment"], "OUTDOOR")
        self.assertIsNone(env["location_id"])
        self.assertEqual(env["infiltration_factor"], 1.0)
        self.assertFalse(env["is_inside_saved_place"])

    def test_hysteresis_debouncing(self):
        # User was previously in HOME (id: 1).
        # Position slightly past radius (100m) at 110m.
        # With hysteresis buffer (+25m + accuracy buffer), effective boundary is >135m.
        # It should maintain HOME on 1st sample.
        home_lat, home_lon = 28.6139, 77.2090
        # Offset ~110m north (1 deg lat ~ 111,000m -> 0.001 deg ~ 111m)
        slightly_outside_lat = home_lat + 0.0010
        slightly_outside_lon = home_lon

        env, count = resolve_user_environment(
            lat=slightly_outside_lat,
            lon=slightly_outside_lon,
            saved_places=self.places,
            previous_place_id=1,
            outside_sample_count=0,
        )
        self.assertEqual(env["environment"], "HOME")
        self.assertEqual(env["location_id"], 1)


class TestStationSelectorCore(unittest.TestCase):
    """Tests for multi-factor station suitability scoring."""

    def test_score_station_pm25_presence_vs_missing(self):
        station_with_pm25 = {
            "id": 101,
            "name": "Station A",
            "distance_meters": 3000,
            "datetimeLast": datetime.now(timezone.utc).isoformat(),
            "sensors": [
                {"id": 1, "parameter": {"name": "pm25", "units": "µg/m³"}},
                {"id": 2, "parameter": {"name": "pm10", "units": "µg/m³"}},
            ],
            "provider": {"name": "National Air Agency"},
            "coordinates": {"latitude": 28.61, "longitude": 77.20},
        }

        station_without_pm25 = {
            "id": 102,
            "name": "Station B",
            "distance_meters": 3000,
            "datetimeLast": datetime.now(timezone.utc).isoformat(),
            "sensors": [
                {"id": 3, "parameter": {"name": "pm10", "units": "µg/m³"}},
            ],
            "provider": {"name": "National Air Agency"},
            "coordinates": {"latitude": 28.61, "longitude": 77.20},
        }

        score_a = score_station(28.60, 77.20, station_with_pm25)
        score_b = score_station(28.60, 77.20, station_without_pm25)

        self.assertTrue(score_a["has_pm25"])
        self.assertFalse(score_b["has_pm25"])
        self.assertGreater(score_a["score"], score_b["score"])

    def test_select_best_station(self):
        candidates = [
            {
                "id": 1,
                "name": "Stale Station",
                "distance_meters": 1000,
                "datetimeLast": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
                "sensors": [{"id": 1, "parameter": {"name": "pm25"}}],
            },
            {
                "id": 2,
                "name": "Fresh Station",
                "distance_meters": 4000,
                "datetimeLast": datetime.now(timezone.utc).isoformat(),
                "sensors": [
                    {"id": 2, "parameter": {"name": "pm25"}},
                    {"id": 3, "parameter": {"name": "pm10"}},
                    {"id": 4, "parameter": {"name": "no2"}},
                ],
            },
        ]
        best = select_best_station_for_location(28.60, 77.20, candidates)
        self.assertIsNotNone(best)
        self.assertEqual(best["station"]["name"], "Fresh Station")


if __name__ == "__main__":
    unittest.main()
