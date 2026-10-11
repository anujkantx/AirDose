"""AI Exposure Advisor Domain Service for AirDose.

Responsibilities:
- Builds mathematically grounded prompts from real AirDose calculations.
- Evaluates hypothetical scenarios using existing core formulas (zero invented numbers).
- Delegates inference to Amazon Bedrock Converse API.
- Provides robust, calibrated fallback analysis if AWS credentials are not configured or service is throttled.
- Enforces strict educational/environmental boundaries (no medical diagnoses).
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.constants import (
    BASE_BREATHING_RATE_M3_S,
    DEFAULT_BREATHING_FACTOR,
    DEFAULT_INDOOR_FACTOR,
    OUTDOOR_FACTOR,
)
from app.core.exposure import (
    calculate_inhalation_rate,
    calculate_exposure_increment,
    calculate_cigarette_equivalent,
    calculate_who_guideline_metrics,
)
from app.schemas.ai import (
    ExposureContext,
    ChatMessage,
    AdvisorRequest,
    AdvisorResponse,
    ExplainExposureRequest,
    ExplainExposureResponse,
)
from app.services.bedrock_service import bedrock_service

# Normalized breathing factors for activity mapping
ACTIVITY_BREATHING_MAP: Dict[str, float] = {
    "rest": 1.0,
    "sedentary": 1.0,
    "sitting": 1.0,
    "sleeping": 0.8,
    "walk": 1.8,
    "walking": 1.8,
    "stroll": 1.5,
    "run": 3.5,
    "running": 3.5,
    "jog": 3.0,
    "jogging": 3.0,
    "workout": 5.0,
    "gym": 4.0,
    "exercise": 4.0,
    "cycling": 3.2,
    "bike": 3.2,
    "biking": 3.2,
}


def _resolve_breathing_factor(activity_name: Optional[str], default_val: float = 1.0) -> float:
    if not activity_name:
        return default_val
    cleaned = activity_name.strip().lower()
    for key, val in ACTIVITY_BREATHING_MAP.items():
        if key in cleaned:
            return val
    return default_val


class AiAdvisorService:
    """Orchestrates calculations, prompt grounding, and Bedrock invocation."""

    def build_verified_context(self, ctx: Optional[ExposureContext]) -> Dict[str, Any]:
        """Calculates and verifies all numerical dosimetry variables using AirDose core formulas."""
        if ctx is None:
            ctx = ExposureContext(
                location="Current Location",
                concentration=75.0,
                activity="Rest",
                duration_minutes=30.0,
                breathing_factor=1.0,
                infiltration_factor=1.0,
                data_source="demo",
            )

        pm25 = max(0.0, float(ctx.concentration))
        inf = max(0.0, min(1.0, float(ctx.infiltration_factor if ctx.infiltration_factor is not None else 1.0)))
        bf = max(0.1, float(ctx.breathing_factor if ctx.breathing_factor is not None else _resolve_breathing_factor(ctx.activity, 1.0)))
        dur_min = max(0.0, float(ctx.duration_minutes if ctx.duration_minutes is not None else 30.0))
        dur_sec = dur_min * 60.0

        # Exact core mathematical calculations
        rate_ug_s = calculate_inhalation_rate(
            pm25=pm25,
            infiltration_factor=inf,
            breathing_factor=bf,
            base_breathing_rate=BASE_BREATHING_RATE_M3_S,
        )

        total_dose_ug = ctx.total_exposure_ug
        if total_dose_ug is None or total_dose_ug <= 0.0:
            total_dose_ug = calculate_exposure_increment(rate_ug_s, dur_sec)

        cigarettes = ctx.cigarettes_equivalent
        if cigarettes is None:
            cigarettes = calculate_cigarette_equivalent(total_dose_ug)

        who_metrics = calculate_who_guideline_metrics(total_dose_ug)

        return {
            "location": ctx.location or "Current Location",
            "pollutant": ctx.pollutant or "pm25",
            "concentration": round(pm25, 2),
            "unit": ctx.unit or "µg/m³",
            "aqi": ctx.aqi,
            "activity": ctx.activity or "Rest",
            "duration_minutes": round(dur_min, 1),
            "breathing_factor": round(bf, 2),
            "infiltration_factor": round(inf, 2),
            "inhalation_rate_ug_s": round(rate_ug_s, 6),
            "total_exposure_ug": round(total_dose_ug, 2),
            "cigarettes_equivalent": cigarettes,
            "who_percentage": who_metrics["percentage_of_who_limit"],
            "who_status": who_metrics["status"],
            "clean_air_shield_saved_ug": round(float(ctx.clean_air_shield_saved_ug or 0.0), 2),
            "data_source": ctx.data_source or "demo",
            "observed_at": ctx.observed_at,
        }

    def detect_hypothetical_scenario(
        self,
        user_message: str,
        current_ctx: Dict[str, Any],
        explicit_activity: Optional[str] = None,
        explicit_duration: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """Parses what-if scenarios from user query or explicit parameters, computing mathematical deltas."""
        target_activity = explicit_activity
        target_duration = explicit_duration

        msg_lower = user_message.lower()

        # Check for duration changes in text if not explicitly provided
        if target_duration is None:
            dur_match = re.search(r"(\d+)\s*(?:min|minute|mins|minutes)", msg_lower)
            if dur_match:
                target_duration = float(dur_match.group(1))

        # Check for activity changes in text if not explicitly provided
        if target_activity is None:
            for act_key in ACTIVITY_BREATHING_MAP:
                if act_key in msg_lower and act_key != current_ctx["activity"].lower():
                    target_activity = act_key.capitalize()
                    break

        # If no what-if parameters detected, return None
        if target_activity is None and target_duration is None:
            return None

        hyp_act = target_activity or current_ctx["activity"]
        hyp_dur = target_duration if target_duration is not None else current_ctx["duration_minutes"]
        hyp_bf = _resolve_breathing_factor(hyp_act, current_ctx["breathing_factor"])
        hyp_dur_sec = hyp_dur * 60.0

        # Exact core mathematical calculations for hypothetical
        hyp_rate = calculate_inhalation_rate(
            pm25=current_ctx["concentration"],
            infiltration_factor=current_ctx["infiltration_factor"],
            breathing_factor=hyp_bf,
            base_breathing_rate=BASE_BREATHING_RATE_M3_S,
        )
        hyp_dose = calculate_exposure_increment(hyp_rate, hyp_dur_sec)
        hyp_cigs = calculate_cigarette_equivalent(hyp_dose)
        hyp_who = calculate_who_guideline_metrics(hyp_dose)

        diff_dose = round(current_ctx["total_exposure_ug"] - hyp_dose, 2)
        pct_change = round(((hyp_dose - current_ctx["total_exposure_ug"]) / max(0.001, current_ctx["total_exposure_ug"])) * 100.0, 1)

        return {
            "hypothetical_activity": hyp_act,
            "hypothetical_duration_minutes": hyp_dur,
            "hypothetical_breathing_factor": hyp_bf,
            "hypothetical_inhalation_rate_ug_s": round(hyp_rate, 6),
            "hypothetical_dose_ug": round(hyp_dose, 2),
            "hypothetical_cigarettes": hyp_cigs,
            "hypothetical_who_percentage": hyp_who["percentage_of_who_limit"],
            "difference_dose_ug": diff_dose,
            "percentage_change": pct_change,
        }

    def _generate_rule_based_fallback_answer(
        self,
        user_message: str,
        ctx: Dict[str, Any],
        hypothetical: Optional[Dict[str, Any]],
        reason_note: str,
    ) -> str:
        """Deterministic, calculation-grounded expert response when Bedrock is offline/unconfigured."""
        pm25 = ctx["concentration"]
        activity = ctx["activity"]
        dur = ctx["duration_minutes"]
        dose = ctx["total_exposure_ug"]
        cigs = ctx["cigarettes_equivalent"]
        who_pct = ctx["who_percentage"]
        source = ctx["data_source"].upper()

        lines = [
            f"**AirDose Exposure Assessment** ({source} DATA)",
            f"",
            f"• **Current Scenario:** Inhaling at **{pm25} µg/m³** PM2.5 in **{ctx['location']}** while **{activity}** ({ctx['breathing_factor']}x exertion) for **{dur} mins**.",
            f"• **Calculated Inhaled Mass:** **{dose} µg** of fine particulate matter deposited along the respiratory tract.",
            f"• **Health Benchmarks:** Equivalent to smoking **~{cigs} cigarettes** (Berkeley Earth metric) and accounts for **{who_pct}%** of the WHO daily 24h cap (25.0 µg/day).",
        ]

        # Ingestion of hypothetical if present
        if hypothetical:
            lines.extend([
                "",
                "**What-If Scenario Comparison:**",
                f"• Switching to **{hypothetical['hypothetical_activity']}** for **{hypothetical['hypothetical_duration_minutes']} min** changes your breathing factor to **{hypothetical['hypothetical_breathing_factor']}x**.",
                f"• New Inhaled Dose: **{hypothetical['hypothetical_dose_ug']} µg** (Difference: **{abs(hypothetical['difference_dose_ug'])} µg**, {'reduction' if hypothetical['difference_dose_ug'] > 0 else 'increase'}).",
            ])

        # Tailored guidance based on PM2.5 thresholds
        lines.append("")
        lines.append("**Recommendations:**")
        if pm25 > 150:
            lines.append("• **Severe Pollution Alert:** Outdoor aerobic exercise is not advised right now. Reschedule strenuous runs or move to an indoor gym with HEPA filtration.")
            lines.append("• If outdoor transit is unavoidable, wear a snug-fitting **N95 / FFP2 respirator** to block up to 95% of fine particles.")
        elif pm25 > 60:
            lines.append("• **Elevated Particulate Level:** Keep outdoor runs under 30 minutes, or replace running with brisk indoor walking.")
            lines.append("• Keep windows sealed and vehicle AC set to **internal recirculation** to cut PM2.5 infiltration by 60-80%.")
        else:
            lines.append("• Air quality is within moderate/acceptable ranges for general outdoor exercise.")
            lines.append("• Sensitive individuals should monitor peak morning and evening rush-hour traffic corridors.")

        lines.append("")
        lines.append(f"*{reason_note}*")
        lines.append("*Disclaimer: AirDose is an educational environmental exposure tracking tool, not a medical diagnosis system.*")

        return "\n".join(lines)

    async def get_advisor_response(self, request: AdvisorRequest) -> AdvisorResponse:
        """Processes advisor query, evaluates formulas, builds context, and invokes Bedrock."""
        verified_ctx = self.build_verified_context(request.context)
        hypothetical = self.detect_hypothetical_scenario(
            user_message=request.message,
            current_ctx=verified_ctx,
            explicit_activity=request.hypothetical_activity,
            explicit_duration=request.hypothetical_duration_minutes,
        )

        # Build grounded prompt containing exact verified numbers
        context_prompt = (
            f"=== VERIFIED AIRDOSE CALCULATION CONTEXT ===\n"
            f"- Location: {verified_ctx['location']}\n"
            f"- Data Source: {verified_ctx['data_source'].upper()} (Note: if DEMO/FALLBACK, mention this clearly to the user)\n"
            f"- Ambient PM2.5 Concentration: {verified_ctx['concentration']} {verified_ctx['unit']}\n"
            f"- Air Quality Index (AQI): {verified_ctx['aqi'] if verified_ctx['aqi'] is not None else 'N/A'}\n"
            f"- Current Activity: {verified_ctx['activity']}\n"
            f"- Duration: {verified_ctx['duration_minutes']} minutes\n"
            f"- Infiltration Factor: {verified_ctx['infiltration_factor']} (1.0 = outdoor, 0.5 = indoor, 0.2 = recirc AC)\n"
            f"- Breathing Exertion Factor: {verified_ctx['breathing_factor']}x (relative to 6 L/min resting adult)\n"
            f"- Calculated Inhalation Rate: {verified_ctx['inhalation_rate_ug_s']} µg/second\n"
            f"- Calculated Total Inhaled Mass: {verified_ctx['total_exposure_ug']} µg\n"
            f"- Berkeley Earth Cigarette Equivalence: ~{verified_ctx['cigarettes_equivalent']} cigarettes\n"
            f"- WHO 24h Recommended Limit Percentage: {verified_ctx['who_percentage']}% ({verified_ctx['who_status']})\n"
            f"- Shielded Mass Saved by Indoor Filtering: {verified_ctx['clean_air_shield_saved_ug']} µg\n"
        )

        if hypothetical:
            context_prompt += (
                f"\n=== VERIFIED HYPOTHETICAL WHAT-IF SCENARIO ===\n"
                f"- Proposed Activity: {hypothetical['hypothetical_activity']} ({hypothetical['hypothetical_breathing_factor']}x breathing)\n"
                f"- Proposed Duration: {hypothetical['hypothetical_duration_minutes']} minutes\n"
                f"- Hypothetical Inhaled Dose: {hypothetical['hypothetical_dose_ug']} µg\n"
                f"- Hypothetical Cigarette Equivalence: ~{hypothetical['hypothetical_cigarettes']} cigs\n"
                f"- Inhaled Mass Difference: {hypothetical['difference_dose_ug']} µg ({hypothetical['percentage_change']}% change)\n"
                f"Explain this exact computed difference to the user without fabricating any new numbers."
            )

        # Assemble conversation messages for Converse API
        messages: List[Dict[str, Any]] = []

        # Add prior conversation history if provided
        if request.conversation_history:
            for past_msg in request.conversation_history[-6:]:  # Keep recent context window
                messages.append({
                    "role": past_msg.role,
                    "content": past_msg.content,
                })

        # Append current user prompt augmented with verified calculation context
        current_content = (
            f"{context_prompt}\n\n"
            f"User Question: {request.message}"
        )
        messages.append({
            "role": "user",
            "content": current_content,
        })

        # Invoke Amazon Bedrock Converse API
        success, answer, meta = bedrock_service.invoke_converse(messages=messages)

        if success and answer:
            return AdvisorResponse(
                success=True,
                answer=answer,
                model_provider="amazon-bedrock",
                model_id=meta.get("model_id"),
                data_source=verified_ctx["data_source"],
                calculated_context={
                    "actual": verified_ctx,
                    "hypothetical": hypothetical,
                },
            )

        # Fallback handling when AWS credentials / model access are missing or error occurs
        error_type = meta.get("error_type", "SERVICE_UNAVAILABLE")
        error_detail = meta.get("error_detail", "Amazon Bedrock service is currently unavailable.")

        note = f"[Amazon Bedrock Status: {error_type} - {error_detail}. Grounded in AirDose mathematical engine.]"
        fallback_answer = self._generate_rule_based_fallback_answer(
            user_message=request.message,
            ctx=verified_ctx,
            hypothetical=hypothetical,
            reason_note=note,
        )

        return AdvisorResponse(
            success=True,  # Return gracefully to UI with clear status
            answer=fallback_answer,
            model_provider="amazon-bedrock-fallback",
            model_id=meta.get("model_id", settings.BEDROCK_MODEL_ID),
            data_source=verified_ctx["data_source"],
            calculated_context={
                "actual": verified_ctx,
                "hypothetical": hypothetical,
            },
            error_type=error_type,
            error_detail=error_detail,
        )

    async def explain_exposure(self, request: ExplainExposureRequest) -> ExplainExposureResponse:
        """Generates a direct, comprehensive explanation of verified exposure metrics."""
        verified_ctx = self.build_verified_context(request.context)

        prompt = (
            f"Explain the following personal PM2.5 inhalation dosimeter metrics for an individual:\n"
            f"- Location: {verified_ctx['location']}\n"
            f"- Ambient PM2.5: {verified_ctx['concentration']} µg/m³\n"
            f"- Activity: {verified_ctx['activity']} ({verified_ctx['breathing_factor']}x exertion)\n"
            f"- Duration: {verified_ctx['duration_minutes']} minutes\n"
            f"- Total Inhaled Mass: {verified_ctx['total_exposure_ug']} µg\n"
            f"- Inhalation Rate: {verified_ctx['inhalation_rate_ug_s']} µg/s\n"
            f"- Berkeley Earth Cigarette Equivalence: ~{verified_ctx['cigarettes_equivalent']} cigs\n"
            f"- WHO 24h Benchmark Percentage: {verified_ctx['who_percentage']}%\n"
            f"- Data Source: {verified_ctx['data_source'].upper()}\n\n"
            f"Provide:\n"
            f"1. A concise overview of this exposure.\n"
            f"2. Three bullet points breaking down why this dose accumulated (ventilation vs ambient).\n"
            f"3. Three actionable, non-medical recommendations to minimize subsequent lung burden."
        )

        messages = [{"role": "user", "content": prompt}]
        success, answer, meta = bedrock_service.invoke_converse(messages=messages)

        summary_text = (
            f"Your estimated inhaled dose is {verified_ctx['total_exposure_ug']} µg PM2.5 over "
            f"{verified_ctx['duration_minutes']} minutes of {verified_ctx['activity']} "
            f"({verified_ctx['cigarettes_equivalent']} cigarette equivalent)."
        )

        breakdown_items = [
            f"Ambient Concentration: {verified_ctx['concentration']} µg/m³ at {verified_ctx['location']}.",
            f"Physical Respiration: {verified_ctx['activity']} elevates ventilation to {verified_ctx['breathing_factor']}x basal rate.",
            f"Guideline Compliance: Reached {verified_ctx['who_percentage']}% of the WHO daily 25 µg limit.",
        ]

        recommendations = [
            "Switch indoor air conditioning to Recirculation / HEPA filtration mode.",
            "Schedule outdoor aerobic exercise during midday dispersion hours rather than morning rush hour.",
            "Wear an N95 respirator if outdoor PM2.5 exceeds 100 µg/m³.",
        ]

        if success and answer:
            return ExplainExposureResponse(
                success=True,
                answer=answer,
                summary=summary_text,
                breakdown=breakdown_items,
                actionable_recommendations=recommendations,
                model_provider="amazon-bedrock",
                model_id=meta.get("model_id"),
                data_source=verified_ctx["data_source"],
                calculated_context=verified_ctx,
            )

        # Fallback
        error_type = meta.get("error_type", "OFFLINE_MODE")
        error_detail = meta.get("error_detail", "Bedrock credentials not configured.")
        fallback_answer = self._generate_rule_based_fallback_answer(
            user_message="Explain my exposure",
            ctx=verified_ctx,
            hypothetical=None,
            reason_note=f"[Amazon Bedrock Status: {error_type} - {error_detail}]",
        )

        return ExplainExposureResponse(
            success=True,
            answer=fallback_answer,
            summary=summary_text,
            breakdown=breakdown_items,
            actionable_recommendations=recommendations,
            model_provider="amazon-bedrock-fallback",
            model_id=settings.BEDROCK_MODEL_ID,
            data_source=verified_ctx["data_source"],
            calculated_context=verified_ctx,
            error_type=error_type,
            error_detail=error_detail,
        )


# Singleton instance
ai_advisor_service = AiAdvisorService()
