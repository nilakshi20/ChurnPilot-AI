from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_envelope() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200

    body = response.json()
    assert "success" in body
    assert "data" in body
    assert "message" in body
    assert body["data"]["version"] == "1.0.0"
    assert body["data"]["database"] in {"connected", "disconnected"}
    assert body["data"]["status"] in {"healthy", "degraded"}
