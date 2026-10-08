"""API route integration tests for AirDose.

Tests:
1. Health check
2. Auth endpoints (signup, signin, me)
3. Locations endpoints (CRUD)
4. Exposure endpoints (today, track, current, stop, history)
5. Air Quality endpoint
"""

import unittest
from starlette.testclient import TestClient

from app.main import app
from app.db.init_db import init_db
from app.db.connection import get_db


class TestApiRoutes(unittest.TestCase):
    """End-to-end API route tests."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["database"], "sqlite3")

    def test_auth_and_locations_flow(self):
        # 1. Sign up a new user
        test_email = "route_test_user@example.com"
        # Clean previous run if exists
        with get_db() as conn:
            conn.execute("DELETE FROM users WHERE email = ?", (test_email,))

        signup_res = self.client.post(
            "/api/auth/signup",
            json={"name": "Route Tester", "email": test_email, "password": "password123"},
        )
        self.assertEqual(signup_res.status_code, 200)
        auth_data = signup_res.json()
        token = auth_data["token"]
        user_id = auth_data["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Add saved location
        loc_res = self.client.post(
            "/api/locations",
            headers=headers,
            json={
                "name": "My Test Home",
                "location_type": "home",
                "latitude": 28.6139,
                "longitude": 77.2090,
                "radius_meters": 100.0,
                "questionnaire": {
                    "enclosure": "fully_enclosed",
                    "window_opening": "sometimes",
                    "ventilation_type": "natural",
                    "ac_usage": "no_ac",
                    "air_purifier": "no_purifier",
                },
            },
        )
        self.assertEqual(loc_res.status_code, 200)
        loc_data = loc_res.json()
        loc_id = loc_data["id"]
        self.assertEqual(loc_data["name"], "My Test Home")
        self.assertAlmostEqual(loc_data["indoor_coefficient"], 0.60, places=2)

        # 3. Get user locations
        get_locs_res = self.client.get("/api/locations", headers=headers)
        self.assertEqual(get_locs_res.status_code, 200)
        loc_list = get_locs_res.json()
        self.assertTrue(any(l["id"] == loc_id for l in loc_list))

        # 4. Clean up location
        del_res = self.client.delete(f"/api/locations/{loc_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

    def test_exposure_lifecycle_routes(self):
        # Using demo token for user id 1
        headers = {"Authorization": "Bearer mvp-token-1-demo@example.com"}

        # 1. Today exposure endpoint before tracking
        today_res = self.client.get("/api/exposure/today", headers=headers)
        self.assertEqual(today_res.status_code, 200)
        today_data = today_res.json()
        self.assertIn("date", today_data)
        self.assertIn("total_exposure_ug", today_data)
        self.assertIn("contributions", today_data)

        # 2. Current tracking state
        current_res = self.client.get("/api/exposure/current", headers=headers)
        self.assertEqual(current_res.status_code, 200)

        # 3. Send location tick (track)
        track_res = self.client.post(
            "/api/exposure/track",
            headers=headers,
            json={
                "latitude": 28.6139,
                "longitude": 77.2090,
                "accuracy": 10.0,
                "breathing_factor": 1.0,
            },
        )
        self.assertEqual(track_res.status_code, 200)
        track_data = track_res.json()
        self.assertEqual(track_data["status"], "success")
        self.assertIn("state", track_data)
        self.assertIn("total_exposure_ug", track_data)

        # 4. Today exposure endpoint while tracking
        today_tracking_res = self.client.get("/api/exposure/today", headers=headers)
        self.assertEqual(today_tracking_res.status_code, 200)
        today_tracking_data = today_tracking_res.json()
        self.assertTrue(today_tracking_data["tracking"])
        self.assertIsNotNone(today_tracking_data["current"])
        self.assertEqual(today_tracking_data["current"]["environment"], "HOME")

        # 5. Stop tracking
        stop_res = self.client.post("/api/exposure/stop", headers=headers)
        self.assertEqual(stop_res.status_code, 200)
        stop_data = stop_res.json()
        self.assertFalse(stop_data["tracking"])

        # 6. History endpoint (7-day default)
        hist_res = self.client.get("/api/exposure/history?period=week", headers=headers)
        self.assertEqual(hist_res.status_code, 200)
        hist_data = hist_res.json()
        self.assertEqual(hist_data["period"], "week")
        self.assertEqual(len(hist_data["data"]), 7)

    def test_air_quality_route(self):
        res = self.client.get("/api/air-quality?lat=28.6139&lon=77.2090")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("aqi", data)
        self.assertIn("pollutants", data)
        self.assertIn("coordinates", data)
        self.assertIn("data_quality", data)

    def test_simulate_trip_route(self):
        headers = {"Authorization": "Bearer mvp-token-1-demo@example.com"}
        res = self.client.post(
            "/api/exposure/simulate-trip",
            headers=headers,
            json={"duration_minutes": 30.0, "ambient_pm25": 80.0},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["duration_minutes"], 30.0)
        self.assertIn("options", data)
        self.assertGreater(len(data["options"]), 0)
        self.assertIn("safest_mode", data)
        self.assertIn("max_dose_savings_ug", data)


if __name__ == "__main__":
    unittest.main()
