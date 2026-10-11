"""Unit and integration tests for Amazon Bedrock AI Exposure Advisor.

Validates:
1. Grounded calculation integrity (zero invented numbers)
2. What-if hypothetical scenario calculations
3. Mocked successful Bedrock Converse API inference
4. Missing AWS credentials handling & fallback
5. Unauthorized model access error handling
6. Bedrock API timeout handling & fallback
7. Demo vs Live vs Fallback data provenance labeling
8. Input validation and edge-case resilience
9. API route execution for /api/ai/advisor, /api/ai/explain-exposure, and /api/ai/status
"""

import unittest
from unittest.mock import patch, MagicMock
from starlette.testclient import TestClient
from botocore.exceptions import ClientError, ReadTimeoutError, NoCredentialsError

from app.main import app
from app.schemas.ai import (
    ExposureContext,
    AdvisorRequest,
    ExplainExposureRequest,
)
from app.services.ai_advisor_service import ai_advisor_service
from app.services.bedrock_service import BedrockService


class TestAiAdvisor(unittest.TestCase):
    """Test suite for AI Exposure Advisor and Bedrock integration."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_status_endpoint(self):
        """Validates that GET /api/ai/status returns valid Bedrock configuration."""
        res = self.client.get("/api/ai/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ready")
        self.assertEqual(data["provider"], "amazon-bedrock")
        self.assertTrue(data["converse_api_supported"])
        self.assertIn("model_id", data)
        self.assertIn("region", data)

    def test_build_verified_context_grounding(self):
        """Verifies that all numerical dosimetry metrics match AirDose core formulas exactly."""
        # 100 µg/m³, outdoor (1.0), running (3.5x), 60 mins (3600s), base 0.0001 m³/s
        # Inhalation rate = 100 * 1.0 * 3.5 * 0.0001 = 0.035 µg/s
        # Total dose = 0.035 * 3600 = 126.0 µg
        # Cigarettes = 126 / 20 = 6.3
        # WHO limit (25 µg) % = (126 / 25) * 100 = 504%
        ctx = ExposureContext(
            location="Central Park",
            concentration=100.0,
            activity="Running",
            duration_minutes=60.0,
            breathing_factor=3.5,
            infiltration_factor=1.0,
            data_source="live",
        )
        verified = ai_advisor_service.build_verified_context(ctx)

        self.assertEqual(verified["concentration"], 100.0)
        self.assertEqual(verified["breathing_factor"], 3.5)
        self.assertAlmostEqual(verified["inhalation_rate_ug_s"], 0.035, places=5)
        self.assertAlmostEqual(verified["total_exposure_ug"], 126.0, places=1)
        self.assertAlmostEqual(verified["cigarettes_equivalent"], 6.3, places=1)
        self.assertAlmostEqual(verified["who_percentage"], 504.0, places=0)
        self.assertEqual(verified["data_source"], "live")

    def test_hypothetical_what_if_calculation(self):
        """Verifies mathematical calculation of hypothetical scenario differences."""
        base_ctx = {
            "location": "Downtown",
            "concentration": 80.0,
            "activity": "Running",
            "duration_minutes": 60.0,
            "breathing_factor": 3.5,
            "infiltration_factor": 1.0,
            "total_exposure_ug": 100.8,
            "data_source": "live",
        }

        # Scenario: "What happens if I walk for 30 minutes instead of running?"
        hyp = ai_advisor_service.detect_hypothetical_scenario(
            user_message="What happens if I walk for 30 minutes instead of running?",
            current_ctx=base_ctx,
            explicit_activity=None,
            explicit_duration=None,
        )

        self.assertIsNotNone(hyp)
        self.assertEqual(hyp["hypothetical_activity"], "Walk")
        self.assertEqual(hyp["hypothetical_duration_minutes"], 30.0)
        # Walking breathing factor = 1.8
        # Rate = 80 * 1.0 * 1.8 * 0.0001 = 0.0144 µg/s
        # Dose = 0.0144 * 1800s = 25.92 µg
        self.assertAlmostEqual(hyp["hypothetical_dose_ug"], 25.92, places=1)
        # Difference = 100.8 - 25.92 = 74.88 µg saved
        self.assertAlmostEqual(hyp["difference_dose_ug"], 74.88, places=1)

    @patch("app.services.bedrock_service.BedrockService._get_client")
    def test_mocked_bedrock_converse_success(self, mock_get_client):
        """Tests successful Amazon Bedrock Converse API invocation and response parsing."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_client.converse.return_value = {
            "output": {
                "message": {
                    "role": "assistant",
                    "content": [{"text": "Based on your 100 µg/m³ PM2.5 level and 45 minutes of running, your estimated inhaled mass is 94.5 µg."}],
                }
            },
            "stopReason": "end_turn",
            "usage": {"inputTokens": 180, "outputTokens": 45, "totalTokens": 225},
            "metrics": {"latencyMs": 350},
        }

        service = BedrockService()
        success, text, meta = service.invoke_converse(
            messages=[{"role": "user", "content": "Can I go running?"}],
        )

        self.assertTrue(success)
        self.assertIn("94.5 µg", text)
        self.assertEqual(meta["model_provider"], "amazon-bedrock")
        self.assertEqual(meta["usage"]["totalTokens"], 225)

    @patch("app.services.bedrock_service.BedrockService._get_client")
    def test_missing_credentials_fallback(self, mock_get_client):
        """Verifies that missing AWS credentials trigger an accurate fallback without crashing."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.converse.side_effect = NoCredentialsError()

        service = BedrockService()
        success, text, meta = service.invoke_converse(
            messages=[{"role": "user", "content": "Explain my exposure"}],
        )

        self.assertFalse(success)
        self.assertEqual(meta["error_type"], "MISSING_CREDENTIALS")
        self.assertIn("AWS credentials", meta["error_detail"])

        # Service-level query should return calibrated mathematical fallback
        req = AdvisorRequest(
            message="Can I run outside today?",
            context=ExposureContext(
                location="Delhi",
                concentration=120.0,
                activity="Run",
                duration_minutes=45.0,
                data_source="demo",
            ),
        )
        import asyncio
        resp = asyncio.run(ai_advisor_service.get_advisor_response(req))
        self.assertTrue(resp.success)
        self.assertIn("AirDose Exposure Assessment", resp.answer)
        self.assertIn("DEMO DATA", resp.answer)
        self.assertIn("MISSING_CREDENTIALS", resp.answer)

    @patch("app.services.bedrock_service.BedrockService._get_client")
    def test_unauthorized_model_access(self, mock_get_client):
        """Verifies that unauthorized model access is captured and reported accurately."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.converse.side_effect = ClientError(
            error_response={"Error": {"Code": "AccessDeniedException", "Message": "Model access is not granted"}},
            operation_name="Converse",
        )

        service = BedrockService()
        success, text, meta = service.invoke_converse(
            messages=[{"role": "user", "content": "Hello"}],
        )

        self.assertFalse(success)
        self.assertEqual(meta["error_type"], "UNAUTHORIZED_MODEL")
        self.assertIn("Access to Bedrock model", meta["error_detail"])

    @patch("app.services.bedrock_service.BedrockService._get_client")
    def test_timeout_handling(self, mock_get_client):
        """Verifies that network/read timeouts are caught and returned gracefully."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.converse.side_effect = ReadTimeoutError(endpoint_url="https://bedrock.test")

        service = BedrockService()
        success, text, meta = service.invoke_converse(
            messages=[{"role": "user", "content": "Hello"}],
        )

        self.assertFalse(success)
        self.assertEqual(meta["error_type"], "TIMEOUT")

    def test_demo_vs_live_labeling(self):
        """Verifies that demo and live data sources are preserved in response payloads."""
        # Demo data context
        demo_req = {
            "message": "Why is my exposure high?",
            "context": {
                "location": "Mock City",
                "pollutant": "pm25",
                "concentration": 85.0,
                "data_source": "demo",
            },
        }
        res_demo = self.client.post("/api/ai/advisor", json=demo_req)
        self.assertEqual(res_demo.status_code, 200)
        data_demo = res_demo.json()
        self.assertEqual(data_demo["data_source"], "demo")

        # Live data context
        live_req = {
            "message": "How can I reduce PM2.5?",
            "context": {
                "location": "Verified Sensor 101",
                "pollutant": "pm25",
                "concentration": 45.0,
                "data_source": "live",
            },
        }
        res_live = self.client.post("/api/ai/advisor", json=live_req)
        self.assertEqual(res_live.status_code, 200)
        data_live = res_live.json()
        self.assertEqual(data_live["data_source"], "live")

    def test_explain_exposure_endpoint(self):
        """Verifies POST /api/ai/explain-exposure returns structured summary and recommendations."""
        req_payload = {
            "context": {
                "location": "Connaught Place",
                "concentration": 150.0,
                "activity": "Walking",
                "duration_minutes": 30.0,
                "data_source": "live",
            }
        }
        res = self.client.post("/api/ai/explain-exposure", json=req_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("summary", data)
        self.assertIn("breakdown", data)
        self.assertIn("actionable_recommendations", data)
        self.assertGreater(len(data["breakdown"]), 0)
        self.assertGreater(len(data["actionable_recommendations"]), 0)

    def test_invalid_input_validation(self):
        """Validates that empty messages or negative concentrations fail validation appropriately."""
        # Empty message
        res1 = self.client.post("/api/ai/advisor", json={"message": "", "context": None})
        self.assertEqual(res1.status_code, 422)

        # Negative concentration
        res2 = self.client.post(
            "/api/ai/advisor",
            json={"message": "Valid prompt", "context": {"concentration": -50.0}},
        )
        self.assertEqual(res2.status_code, 422)


if __name__ == "__main__":
    unittest.main()
