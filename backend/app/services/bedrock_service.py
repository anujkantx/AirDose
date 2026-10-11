"""Amazon Bedrock Service Module for AirDose.

Responsibilities:
- Reusable, resilient Amazon Bedrock Converse API client via official AWS SDK (boto3).
- Uses AWS default credential provider chain and IAM roles (zero hardcoded secrets).
- Implements comprehensive error handling: missing credentials, model access denial,
  throttling, timeouts, service failures.
- Generates high-fidelity, grounded environmental dosimetry explanations.
- In offline/demo mode when AWS credentials are not configured, provides a
  scientifically calibrated fallback without crashing the application.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import (
        ClientError,
        ConnectTimeoutError,
        EndpointConnectionError,
        NoCredentialsError,
        PartialCredentialsError,
        ReadTimeoutError,
    )
    BOTO3_AVAILABLE = True
except ImportError:
    boto3 = None
    Config = None
    ClientError = Exception
    ConnectTimeoutError = Exception
    EndpointConnectionError = Exception
    NoCredentialsError = Exception
    PartialCredentialsError = Exception
    ReadTimeoutError = Exception
    BOTO3_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger("airdose.bedrock")

SYSTEM_EXPOSURE_ADVISOR_PROMPT = """You are the AirDose AI Exposure Advisor, a specialized environmental health and pulmonary inhalation dosimetry expert.

Your role:
1. Explain and interpret the user's personal air pollution exposure, inhalation rates, and lung particulate burden.
2. Use simple, reassuring, scientifically accurate language.
3. GROUNDING RULE (CRITICAL): Never fabricate or invent numerical exposure numbers. All calculations and concentrations provided to you are mathematically verified by the calibrated AirDose calculation engine. Reference these exact numbers.
4. INHALATION PRINCIPLE:
   - Ambient air concentration (µg/m³) is what is in the air.
   - Inhaled dose (µg) is what actually enters the respiratory tract, determined by: Ambient PM2.5 × Infiltration Factor × Breathing Exertion Multiplier × Basal Ventilation (6 L/min) × Exposure Duration.
   - Strenuous exercise (running at 3.5x breathing) multiplies particulate inhalation 3.5-fold compared to resting!
5. STANDARDS:
   - Berkeley Earth Benchmark: ~20 µg PM2.5 inhaled ≈ 1 cigarette smoke particulate burden.
   - WHO Daily Cap: 25.0 µg/day recommended limit.
6. DATA PROVENANCE:
   - If the data source is flagged as "demo" or "fallback", explicitly inform the user that these values represent an illustrative demonstration scenario.
   - If "live" or "cached", state that these are recent sensor observations.
7. MEDICAL DISCLAIMER: AirDose is an educational environmental exposure and dosimeter tool, not a medical diagnostic service. Keep advice practical (e.g. reschedule outdoor workouts, switch vehicle AC to recirculation, wear a well-fitted N95 respirator).
8. FORMATTING: Use structured bullet points, clear headings, and concise paragraphs (typically under 250-300 words).
"""


class BedrockService:
    """Reusable service client for Amazon Bedrock Converse API and Bedrock API Keys."""

    def __init__(self):
        self._client: Optional[Any] = None
        self._region = settings.AWS_REGION
        self._model_id = settings.BEDROCK_MODEL_ID
        self._api_key = settings.BEDROCK_API_KEY
        self._endpoint_url = settings.BEDROCK_ENDPOINT_URL
        self._max_tokens = settings.BEDROCK_MAX_TOKENS
        self._temperature = settings.BEDROCK_TEMPERATURE
        self._timeout = settings.BEDROCK_TIMEOUT_SECONDS

    @property
    def api_key(self) -> str:
        return settings.BEDROCK_API_KEY or self._api_key

    @property
    def model_id(self) -> str:
        return settings.BEDROCK_MODEL_ID or self._model_id

    @property
    def region(self) -> str:
        return settings.AWS_REGION or self._region

    def _get_client(self) -> Any:
        """Lazily initialize boto3 bedrock-runtime client with custom timeouts and retries."""
        if not BOTO3_AVAILABLE:
            raise NoCredentialsError()
        if self._client is None:
            boto_config = Config(
                region_name=self.region,
                connect_timeout=self._timeout,
                read_timeout=self._timeout,
                retries={"max_attempts": 2, "mode": "standard"},
            )
            self._client = boto3.client(
                service_name="bedrock-runtime",
                config=boto_config,
            )
        return self._client

    def _invoke_with_api_key(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """Invokes Amazon Bedrock Mantle OpenAI-compatible endpoint using a Bedrock API Key (Bearer token)."""
        import time
        import httpx

        api_key = self.api_key
        model_id = self.model_id
        region = self.region
        tokens = max_tokens or self._max_tokens
        temp = temperature if temperature is not None else self._temperature
        sys_prompt = system_prompt or SYSTEM_EXPOSURE_ADVISOR_PROMPT

        endpoint = (
            self._endpoint_url
            or settings.BEDROCK_ENDPOINT_URL
            or f"https://bedrock-mantle.{region}.api.aws/v1/chat/completions"
        )

        # Build message payload
        mantle_messages: List[Dict[str, str]] = []
        if sys_prompt:
            mantle_messages.append({"role": "system", "content": sys_prompt.strip()})

        for msg in messages:
            role = msg.get("role", "user")
            if role not in ("user", "assistant", "system"):
                role = "user"
            content = msg.get("content", "")
            if isinstance(content, list):
                text = "".join(b.get("text", "") for b in content if isinstance(b, dict))
            else:
                text = str(content)
            if text.strip():
                mantle_messages.append({"role": role, "content": text.strip()})

        if not any(m["role"] == "user" for m in mantle_messages):
            mantle_messages.append({"role": "user", "content": "Hello"})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        # If user model fails with 404 (e.g. nova-micro which is only on Converse), try proven Mantle models
        candidate_models = [model_id]
        if model_id != "mistral.ministral-3-3b-instruct":
            candidate_models.append("mistral.ministral-3-3b-instruct")
        if "google.gemma-3-4b-it" not in candidate_models:
            candidate_models.append("google.gemma-3-4b-it")

        t_start = time.perf_counter()

        for active_model in candidate_models:
            payload = {
                "model": active_model,
                "messages": mantle_messages,
                "max_tokens": tokens,
                "temperature": temp,
            }

            try:
                logger.info(
                    "Invoking Amazon Bedrock with model '%s' in region '%s'",
                    active_model,
                    region,
                )
                with httpx.Client(timeout=float(self._timeout)) as client:
                    resp = client.post(endpoint, json=payload, headers=headers)

                elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        ans_text = choices[0].get("message", {}).get("content", "").strip()
                        stop_reason = choices[0].get("finish_reason", "end_turn")
                        usage = data.get("usage", {})
                        return True, ans_text, {
                            "model_provider": "amazon-bedrock",
                            "model_id": data.get("model", active_model),
                            "region": region,
                            "stop_reason": stop_reason,
                            "usage": usage,
                            "latency_ms": elapsed_ms,
                        }

                # Retry next model candidate on 404
                if resp.status_code == 404 and active_model != candidate_models[-1]:
                    logger.warning(
                        "Model '%s' returned 404 on Bedrock Mantle. Retrying with next candidate...",
                        active_model,
                    )
                    continue

                if resp.status_code in (401, 403):
                    return False, "", {
                        "error_type": "UNAUTHORIZED_MODEL",
                        "error_detail": f"Bedrock API key authentication failed ({resp.status_code}): {resp.text[:150]}",
                    }
                elif resp.status_code == 429:
                    return False, "", {
                        "error_type": "THROTTLED",
                        "error_detail": "Bedrock API rate limit exceeded. Please wait a moment before trying again.",
                    }
                elif resp.status_code == 404:
                    return False, "", {
                        "error_type": "MODEL_NOT_FOUND",
                        "error_detail": f"Bedrock model '{active_model}' not found in region '{region}'.",
                    }
                else:
                    return False, "", {
                        "error_type": f"BEDROCK_HTTP_{resp.status_code}",
                        "error_detail": f"Bedrock API error ({resp.status_code}): {resp.text[:150]}",
                    }

            except httpx.TimeoutException:
                return False, "", {
                    "error_type": "TIMEOUT",
                    "error_detail": f"Bedrock request timed out after {self._timeout} seconds.",
                }
            except httpx.ConnectError:
                return False, "", {
                    "error_type": "CONNECTION_ERROR",
                    "error_detail": f"Could not connect to Bedrock endpoint {endpoint}.",
                }
            except Exception as e:
                logger.error("Unexpected error calling Bedrock API: %s", str(e), exc_info=True)
                return False, "", {
                    "error_type": "UNEXPECTED_ERROR",
                    "error_detail": str(e),
                }

        return False, "", {
            "error_type": "SERVICE_UNAVAILABLE",
            "error_detail": "Unable to invoke model via Bedrock API.",
        }

    def invoke_converse(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """Invokes Amazon Bedrock via API key or Converse API with normalized message thread.

        Returns:
            Tuple of:
            - success (bool)
            - response_text (str)
            - metadata (dict with model_id, stop_reason, error_type, error_detail, usage)
        """
        if self.api_key:
            return self._invoke_with_api_key(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )

        model_id = self.model_id
        sys_prompt = system_prompt or SYSTEM_EXPOSURE_ADVISOR_PROMPT
        tokens = max_tokens or self._max_tokens
        temp = temperature if temperature is not None else self._temperature

        # Sanitize messages for Converse API: alternating roles, user first
        sanitized_messages: List[Dict[str, Any]] = []
        for msg in messages:
            role = msg.get("role", "user")
            if role not in ("user", "assistant"):
                role = "user"
            content = msg.get("content", "")
            if not isinstance(content, str) or not content.strip():
                continue

            # Merge consecutive messages of the same role
            if sanitized_messages and sanitized_messages[-1]["role"] == role:
                sanitized_messages[-1]["content"][0]["text"] += f"\n\n{content.strip()}"
            else:
                sanitized_messages.append({
                    "role": role,
                    "content": [{"text": content.strip()}],
                })

        if not sanitized_messages:
            sanitized_messages = [{"role": "user", "content": [{"text": "Hello"}]}]

        # Ensure first message is user
        if sanitized_messages[0]["role"] != "user":
            sanitized_messages.insert(0, {"role": "user", "content": [{"text": "Context overview"}]})

        try:
            client = self._get_client()
            logger.info("Calling Amazon Bedrock Converse API with model: %s in region: %s", model_id, self._region)

            response = client.converse(
                modelId=model_id,
                messages=sanitized_messages,
                system=[{"text": sys_prompt}],
                inferenceConfig={
                    "maxTokens": tokens,
                    "temperature": temp,
                },
            )

            # Parse output
            output = response.get("output", {})
            msg_output = output.get("message", {})
            content_blocks = msg_output.get("content", [])
            text_result = "".join(b.get("text", "") for b in content_blocks if "text" in b).strip()

            usage = response.get("usage", {})
            metrics = response.get("metrics", {})
            stop_reason = response.get("stopReason", "end_turn")

            return True, text_result, {
                "model_provider": "amazon-bedrock",
                "model_id": model_id,
                "region": self._region,
                "stop_reason": stop_reason,
                "usage": usage,
                "latency_ms": metrics.get("latencyMs"),
            }

        except (NoCredentialsError, PartialCredentialsError) as e:
            logger.warning("AWS credentials not configured for Bedrock: %s", str(e))
            return False, "", {
                "error_type": "MISSING_CREDENTIALS",
                "error_detail": (
                    "AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or IAM role) "
                    "are not configured on this machine."
                ),
            }

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "ClientError")
            error_msg = e.response.get("Error", {}).get("Message", str(e))
            logger.warning("Bedrock ClientError [%s]: %s", error_code, error_msg)

            if error_code in ("AccessDeniedException", "UnauthorizedException"):
                return False, "", {
                    "error_type": "UNAUTHORIZED_MODEL",
                    "error_detail": (
                        f"Access to Bedrock model '{model_id}' in region '{self._region}' is denied. "
                        "Please verify model access is granted in the AWS Bedrock Console."
                    ),
                }
            elif error_code in ("ResourceNotFoundException", "ModelNotReadyException"):
                return False, "", {
                    "error_type": "MODEL_NOT_FOUND",
                    "error_detail": f"Bedrock model '{model_id}' was not found or is unavailable in region '{self._region}'.",
                }
            elif error_code in ("ThrottlingException", "TooManyRequestsException"):
                return False, "", {
                    "error_type": "THROTTLED",
                    "error_detail": "Bedrock API request rate limit exceeded. Please wait a moment before trying again.",
                }
            else:
                return False, "", {
                    "error_type": f"BEDROCK_{error_code.upper()}",
                    "error_detail": f"Bedrock request error ({error_code}): {error_msg}",
                }

        except (ReadTimeoutError, ConnectTimeoutError) as e:
            logger.error("Bedrock timeout error: %s", str(e))
            return False, "", {
                "error_type": "TIMEOUT",
                "error_detail": f"Bedrock request timed out after {self._timeout} seconds.",
            }

        except EndpointConnectionError as e:
            logger.error("Bedrock endpoint connection error: %s", str(e))
            return False, "", {
                "error_type": "CONNECTION_ERROR",
                "error_detail": f"Could not connect to Bedrock endpoint in region '{self._region}'.",
            }

        except Exception as e:
            logger.error("Unexpected error in Bedrock service: %s", str(e), exc_info=True)
            return False, "", {
                "error_type": "UNEXPECTED_ERROR",
                "error_detail": f"Unexpected error communicating with Bedrock: {str(e)}",
            }


# Singleton instance
bedrock_service = BedrockService()
