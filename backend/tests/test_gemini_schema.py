import pytest
from pydantic import ValidationError

from app.core.exceptions import AppError
from app.schemas.platform import GeminiRetentionOutput
from app.services.gemini_service import _first_text, _parse_message, _parse_retention


def test_gemini_schema_accepts_valid_payload() -> None:
    parsed = GeminiRetentionOutput.model_validate(
        {
            "strategy": "Call the account manager",
            "priority": "high",
            "reasoning": "Predicted risk is elevated and spend is material.",
            "recommended_action": "outreach",
            "channel": "email",
            "incentive": None,
        }
    )
    assert parsed.incentive is None
    assert parsed.channel == "email"


def test_gemini_schema_rejects_missing_fields() -> None:
    with pytest.raises(ValidationError):
        GeminiRetentionOutput.model_validate({"strategy": "x"})


def test_gemini_json_normalization() -> None:
    parsed = _parse_retention(
        """
        {"strategy": "Winback", "priority": "HIGH", "reasoning": "Inactive",
         "recommended_action": "winback", "channel": "Email", "incentive": ""}
        """
    )
    assert parsed.priority == "high"
    assert parsed.channel == "email"
    assert parsed.recommended_action == "winback"
    assert parsed.incentive is None


def test_first_text_skips_thought_parts() -> None:
    body = {
        "candidates": [
            {"content": {"parts": [{"thoughtSignature": "abc"}, {"text": '{"ok": true}'}]}}
        ]
    }
    assert _first_text(body, error_code="TEST") == '{"ok": true}'


def test_first_text_reports_blocked_prompt() -> None:
    with pytest.raises(AppError) as exc:
        _first_text({"candidates": [], "promptFeedback": {"blockReason": "SAFETY"}}, error_code="TEST")
    assert "SAFETY" in str(exc.value)


def test_first_text_rejects_empty_text() -> None:
    with pytest.raises(AppError):
        _first_text({"candidates": [{"content": {"parts": [{"text": "   "}]}}]}, error_code="TEST")


@pytest.mark.parametrize("channel", ["sms", "whatsapp"])
def test_parse_message_leaves_short_channels_without_a_subject(channel: str) -> None:
    parsed = _parse_message('{"body": "Quick check-in."}', {"channel": channel, "company": "Acme"})
    assert parsed["subject"] is None
    assert parsed["body"] == "Quick check-in."


def test_parse_message_defaults_a_subject_for_email() -> None:
    parsed = _parse_message('{"body": "Hello."}', {"channel": "email", "company": "Acme"})
    assert parsed["subject"] == "A note about Acme"


def test_parse_message_rejects_empty_body() -> None:
    with pytest.raises(AppError):
        _parse_message('{"body": "  "}', {"channel": "email"})
