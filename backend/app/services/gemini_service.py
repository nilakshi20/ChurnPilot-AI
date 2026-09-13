from __future__ import annotations

import json
import logging
import random
import re
import time
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import AppError
from app.schemas.platform import GeminiRetentionOutput

logger = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}
# Quota exhaustion and retired model ids are per model, so move on to the next candidate.
MODEL_FALLBACK_STATUS = {404, 429, 503}
ALLOWED_CHANNELS = {"email", "whatsapp", "sms", "sales_call"}
SUBJECTLESS_CHANNELS = {"sms", "whatsapp"}
ALLOWED_PRIORITIES = {"low", "medium", "high", "urgent"}
ACTION_MAP = {
    "discount": "discount",
    "offer_discount": "discount",
    "incentive": "discount",
    "outreach": "outreach",
    "call": "outreach",
    "email": "outreach",
    "product_education": "product_education",
    "education": "product_education",
    "winback": "winback",
    "pause_plan": "pause_plan",
    "pause": "pause_plan",
    "upgrade": "upgrade",
}


class _ModelUnavailable(Exception):
    """Raised when one model cannot serve a request but another one might."""


class GeminiService:
    def generate_retention(self, payload: dict[str, Any]) -> tuple[GeminiRetentionOutput, str]:
        prompt = _retention_prompt(payload)
        raw = self._complete(prompt, error_code="GEMINI_RETENTION_FAILED")
        parsed = _parse_retention(raw)
        return parsed, "gemini"

    def generate_message(self, payload: dict[str, Any]) -> dict[str, str | None]:
        prompt = _message_prompt(payload)
        raw = self._complete(prompt, error_code="GEMINI_MESSAGE_FAILED")
        return _parse_message(raw, payload)

    def generate_insights(self, metrics: dict[str, Any]) -> list[dict[str, Any]]:
        prompt = _insights_prompt(metrics)
        raw = self._complete(prompt, error_code="GEMINI_INSIGHTS_FAILED")
        return _parse_insights(raw)

    def _complete(self, prompt: str, *, error_code: str) -> str:
        if not settings.GEMINI_API_KEY:
            raise AppError(
                "Gemini API key is not configured",
                status_code=503,
                error_code="GEMINI_UNAVAILABLE",
            )
        request_body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
        chain = settings.gemini_model_chain
        last_error: Exception | None = None

        for model in chain:
            try:
                return self._call_model(model, request_body, error_code=error_code)
            except _ModelUnavailable as exc:
                last_error = exc.__cause__ or exc
                logger.info("Gemini model %s unavailable, trying the next one", model)

        logger.warning("Gemini request failed across models %s: %s", chain, last_error)
        raise AppError(
            "Gemini request failed",
            status_code=503,
            error_code="GEMINI_UNAVAILABLE",
        ) from last_error

    def _call_model(self, model: str, request_body: dict[str, Any], *, error_code: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        attempts = max(1, settings.GEMINI_MAX_ATTEMPTS)
        last_error: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                response = httpx.post(
                    url,
                    # Sent as a header, not a query parameter, so the key never lands in
                    # request logs or error messages.
                    headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                    json=request_body,
                    timeout=settings.GEMINI_TIMEOUT_SECONDS,
                )
                if response.status_code in RETRYABLE_STATUS and attempt < attempts:
                    last_error = httpx.HTTPStatusError(
                        f"status {response.status_code}", request=response.request, response=response
                    )
                    _sleep_before_retry(attempt)
                    continue
                if response.status_code in MODEL_FALLBACK_STATUS:
                    raise _ModelUnavailable(f"{model} returned {response.status_code}") from (
                        httpx.HTTPStatusError(
                            f"status {response.status_code}",
                            request=response.request,
                            response=response,
                        )
                    )
                response.raise_for_status()
                return _first_text(response.json(), error_code=error_code)
            except (AppError, _ModelUnavailable):
                raise
            except httpx.TransportError as exc:
                last_error = exc
                if attempt < attempts:
                    _sleep_before_retry(attempt)
                    continue
                raise _ModelUnavailable(f"{model} is unreachable") from exc
            except Exception as exc:
                raise _ModelUnavailable(f"{model} request failed") from exc

        raise _ModelUnavailable(f"{model} failed after {attempts} attempts") from last_error


def _sleep_before_retry(attempt: int) -> None:
    time.sleep(min(4.0, 0.5 * (2 ** (attempt - 1))) + random.uniform(0, 0.4))


def _first_text(body: dict[str, Any], *, error_code: str) -> str:
    candidates = body.get("candidates") or []
    if not candidates:
        reason = (body.get("promptFeedback") or {}).get("blockReason")
        detail = f" (blocked: {reason})" if reason else ""
        raise AppError(f"Gemini returned no candidates{detail}", error_code=error_code)
    # Reasoning models can emit thought parts before the answer, so take the first
    # part that actually carries text instead of assuming it is parts[0].
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = next((str(part["text"]) for part in parts if part.get("text")), "")
    if not text.strip():
        raise AppError("Gemini returned an empty response", error_code=error_code)
    return text


def _extract_json(text: str) -> Any:
    candidate = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", candidate, re.DOTALL)
    if fenced:
        candidate = fenced.group(1)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        match = re.search(r"(\{.*\}|\[.*\])", candidate, re.DOTALL)
        if not match:
            raise AppError("Gemini returned malformed JSON", error_code="GEMINI_INVALID_JSON") from exc
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as inner:
            raise AppError("Gemini returned malformed JSON", error_code="GEMINI_INVALID_JSON") from inner


def _parse_retention(text: str) -> GeminiRetentionOutput:
    data = _extract_json(text)
    if not isinstance(data, dict):
        raise AppError("Gemini retention payload must be an object", error_code="GEMINI_INVALID_JSON")
    try:
        parsed = GeminiRetentionOutput.model_validate(data)
    except ValidationError as exc:
        raise AppError("Gemini retention payload failed validation", error_code="GEMINI_INVALID_SCHEMA") from exc
    parsed.priority = parsed.priority.strip().lower()
    if parsed.priority not in ALLOWED_PRIORITIES:
        parsed.priority = "medium"
    parsed.channel = parsed.channel.strip().lower().replace(" ", "_")
    if parsed.channel not in ALLOWED_CHANNELS:
        parsed.channel = "email"
    action_key = parsed.recommended_action.strip().lower().replace(" ", "_")
    parsed.recommended_action = ACTION_MAP.get(action_key, "outreach")
    if parsed.incentive == "":
        parsed.incentive = None
    return parsed


def _parse_message(text: str, payload: dict[str, Any]) -> dict[str, str | None]:
    data = _extract_json(text)
    if not isinstance(data, dict):
        raise AppError("Gemini message payload must be an object", error_code="GEMINI_INVALID_JSON")
    body = str(data.get("body") or "").strip()
    if not body:
        raise AppError("Gemini message was empty", error_code="GEMINI_INVALID_SCHEMA")
    subject = data.get("subject")
    if subject:
        resolved = str(subject).strip()
    elif payload.get("channel") in SUBJECTLESS_CHANNELS:
        resolved = None
    else:
        resolved = _default_subject(payload)
    return {"subject": resolved, "body": body}


def _parse_insights(text: str) -> list[dict[str, Any]]:
    data = _extract_json(text)
    if isinstance(data, dict) and "items" in data:
        data = data["items"]
    if not isinstance(data, list):
        raise AppError("Gemini insights payload must be a list", error_code="GEMINI_INVALID_JSON")
    items = []
    for item in data[:5]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        body = str(item.get("body") or "").strip()
        if title and body:
            items.append(
                {
                    "title": title,
                    "body": body,
                    "metric_name": str(item.get("metric_name") or "insight"),
                    "metric_value": item.get("metric_value"),
                    "severity": str(item.get("severity") or "info"),
                    "source": "gemini",
                }
            )
    return items


def _default_subject(payload: dict[str, Any]) -> str:
    company = payload.get("company") or "your account"
    return f"A note about {company}"


def _retention_prompt(payload: dict[str, Any]) -> str:
    return (
        "You are a B2B SaaS retention strategist. Use ONLY the provided customer facts. "
        "Never invent names, dates, spend, tickets, or events. If a field is missing, do not fill it in. "
        "Return JSON with keys strategy, priority, reasoning, recommended_action, channel, incentive. "
        "priority must be one of low, medium, high, urgent. "
        "channel must be one of email, whatsapp, sms, sales_call. "
        "recommended_action must be one of discount, outreach, product_education, winback, pause_plan, upgrade. "
        "incentive may be null. Do not claim that any feature caused churn; discuss predicted risk only.\n\n"
        f"Customer facts:\n{json.dumps(payload, default=str)}"
    )


def _message_prompt(payload: dict[str, Any]) -> str:
    return (
        "Write a retention message using ONLY the provided facts. Never invent customer information. "
        "Do not claim the customer will churn. Do not include a send action. "
        f"Channel: {payload.get('channel')}. Tone: {payload.get('tone')}. "
        "Return JSON with keys subject and body. Subject may be null for sms or whatsapp.\n\n"
        f"Facts:\n{json.dumps(payload, default=str)}"
    )


def _insights_prompt(metrics: dict[str, Any]) -> str:
    return (
        "You are analyzing already-calculated churn analytics. Use ONLY these metrics. "
        "Do not invent counts, rates, or revenue. Do not mention individual customers. "
        "Return JSON list of objects with title, body, metric_name, metric_value, severity.\n\n"
        f"Metrics:\n{json.dumps(metrics, default=str)}"
    )


gemini_service = GeminiService()
