from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
USER_ID = "00000000-0000-4000-8000-000000000001"


def test_health_identifies_service_without_claiming_database_readiness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "payment-service", "status": "ok", "stage": "scaffold", "database": "not_checked"}


def test_docs_and_openapi_are_available():
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "payment-service"


def test_unknown_route_has_structured_error():
    response = client.get("/not-a-route")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_error"


def test_invalid_request_is_structured():
    response = client.post("/api/payments", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"

def test_payments_are_placeholders():
    body = {"user_id": USER_ID, "course_id": 1, "amount": 50000}
    assert client.post("/api/payments", json=body).status_code == 501
    assert client.get(f"/api/payments/{USER_ID}").status_code == 501


def test_payment_rejects_card_fields_and_nonpositive_amounts():
    body = {"user_id": USER_ID, "course_id": 1, "amount": 50000}
    response = client.post("/api/payments", json={**body, "card_number": "never-accept-real-cards"})
    assert response.status_code == 422
    assert "never-accept-real-cards" not in response.text
    assert client.post("/api/payments", json={**body, "amount": 0}).status_code == 422
