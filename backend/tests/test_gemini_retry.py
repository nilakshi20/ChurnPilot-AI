import httpx
import pytest

from app.core.exceptions import AppError
from app.services import gemini_service as module

SUCCESS_BODY = {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {}
        self.request = httpx.Request("POST", "https://generativelanguage.googleapis.test")

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                f"status {self.status_code}", request=self.request, response=self  # type: ignore[arg-type]
            )


@pytest.fixture(autouse=True)
def _configured_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(module.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(module.settings, "GEMINI_MAX_ATTEMPTS", 3)
    # A single-model chain isolates the retry behaviour from the model fallthrough.
    monkeypatch.setattr(module.settings, "GEMINI_FALLBACK_MODELS", "")
    monkeypatch.setattr(module, "_sleep_before_retry", lambda attempt: None)


def test_complete_retries_transient_status_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [FakeResponse(503), FakeResponse(429), FakeResponse(200, SUCCESS_BODY)]
    calls: list[int] = []

    def fake_post(*args, **kwargs) -> FakeResponse:
        calls.append(1)
        return responses[len(calls) - 1]

    monkeypatch.setattr(module.httpx, "post", fake_post)

    assert module.gemini_service._complete("prompt", error_code="TEST") == '{"ok": true}'
    assert len(calls) == 3


def test_complete_gives_up_after_max_attempts(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    def fake_post(*args, **kwargs) -> FakeResponse:
        calls.append(1)
        return FakeResponse(503)

    monkeypatch.setattr(module.httpx, "post", fake_post)

    with pytest.raises(AppError) as exc:
        module.gemini_service._complete("prompt", error_code="TEST")
    assert exc.value.error_code == "GEMINI_UNAVAILABLE"
    assert len(calls) == 3


def test_complete_does_not_retry_client_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    def fake_post(*args, **kwargs) -> FakeResponse:
        calls.append(1)
        return FakeResponse(400)

    monkeypatch.setattr(module.httpx, "post", fake_post)

    with pytest.raises(AppError):
        module.gemini_service._complete("prompt", error_code="TEST")
    assert len(calls) == 1


def test_complete_falls_through_to_the_next_model_when_quota_is_exhausted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(module.settings, "GEMINI_MODEL", "primary-model")
    monkeypatch.setattr(module.settings, "GEMINI_FALLBACK_MODELS", "backup-model")
    monkeypatch.setattr(module.settings, "GEMINI_MAX_ATTEMPTS", 1)
    urls: list[str] = []

    def fake_post(url: str, **kwargs) -> FakeResponse:
        urls.append(url)
        return FakeResponse(429) if "primary-model" in url else FakeResponse(200, SUCCESS_BODY)

    monkeypatch.setattr(module.httpx, "post", fake_post)

    assert module.gemini_service._complete("prompt", error_code="TEST") == '{"ok": true}'
    assert len(urls) == 2
    assert "primary-model" in urls[0]
    assert "backup-model" in urls[1]


def test_model_chain_dedupes_and_preserves_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(module.settings, "GEMINI_MODEL", "a")
    monkeypatch.setattr(module.settings, "GEMINI_FALLBACK_MODELS", " b , a ,, c ")
    assert module.settings.gemini_model_chain == ["a", "b", "c"]


def test_complete_requires_an_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(module.settings, "GEMINI_API_KEY", "")
    with pytest.raises(AppError) as exc:
        module.gemini_service._complete("prompt", error_code="TEST")
    assert exc.value.error_code == "GEMINI_UNAVAILABLE"
