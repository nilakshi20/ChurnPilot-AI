from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_customer_not_found_envelope() -> None:
    response = client.get(f"/api/customers/{uuid4()}")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["message"] == "Customer not found"
    assert body["error_code"] == "CUSTOMER_NOT_FOUND"


def test_customers_list_envelope() -> None:
    response = client.get("/api/customers")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "items" in body["data"]
    assert "pagination" in body["data"]
