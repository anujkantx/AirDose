"""AI Exposure Advisor API Router.
Exposes endpoints for Amazon Bedrock powered conversational advice
and verified exposure explanation.
"""

from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
from app.schemas.ai import (
    AdvisorRequest,
    AdvisorResponse,
    ExplainExposureRequest,
    ExplainExposureResponse,
)
from app.services.ai_advisor_service import ai_advisor_service
from app.core.config import settings

router = APIRouter(prefix="/api/ai", tags=["Amazon Bedrock AI Advisor"])


@router.post("/advisor", response_model=AdvisorResponse)
async def ask_advisor(request: AdvisorRequest):
    """Processes personalized queries regarding outdoor activity, inhalation risk,
    and mitigation strategies grounded in real AirDose dosimetry variables.
    """
    try:
        response = await ai_advisor_service.get_advisor_response(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating AI advisor query: {str(e)}",
        )


@router.post("/explain-exposure", response_model=ExplainExposureResponse)
async def explain_exposure(request: ExplainExposureRequest):
    """Generates an immediate scientific breakdown of currently measured/accumulated
    PM2.5 exposure without requiring free-form user query input.
    """
    try:
        response = await ai_advisor_service.explain_exposure(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error explaining exposure: {str(e)}",
        )


@router.get("/status")
def get_ai_service_status() -> Dict[str, Any]:
    """Returns runtime status and configuration of Amazon Bedrock integration."""
    has_api_key = bool(settings.BEDROCK_API_KEY)
    return {
        "status": "ready",
        "provider": "amazon-bedrock",
        "auth_method": "bedrock-api-key" if has_api_key else "iam-credentials",
        "region": settings.AWS_REGION,
        "model_id": settings.BEDROCK_MODEL_ID,
        "max_tokens": settings.BEDROCK_MAX_TOKENS,
        "temperature": settings.BEDROCK_TEMPERATURE,
        "timeout_seconds": settings.BEDROCK_TIMEOUT_SECONDS,
        "converse_api_supported": True,
    }
