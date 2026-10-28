from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
USER_ID = "00000000-0000-4000-8000-000000000001"


def test_health_identifies_service_without_claiming_database_readiness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "user-service", "status": "ok", "stage": "scaffold", "database": "not_checked"}


def test_docs_and_openapi_are_available():
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "user-service"


def test_unknown_route_has_structured_error():
    response = client.get("/not-a-route")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_error"


def test_invalid_request_is_structured():
    response = client.post("/api/users/register", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"

def test_business_calls_are_explicit_placeholders():
    body = {"email": "demo@example.com", "password": "demo-only-123", "display_name": "Demo"}
    for method, path, payload in [("POST", "/api/users/register", body),
                                   ("POST", "/api/users/login", {k: body[k] for k in ("email", "password")}),
                                   ("GET", "/api/users/me", None)]:
        response = client.request(method, path, **({"json": payload} if payload else {}))
        assert response.status_code == 501
        assert response.json()["error"]["code"] == "not_implemented"


def test_validation_does_not_echo_password():
    response = client.post("/api/users/register", json={"email": "invalid", "password": "secret-sensitive"})
    assert response.status_code == 422
    assert "secret-sensitive" not in response.text
