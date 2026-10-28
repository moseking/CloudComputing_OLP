from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
USER_ID = "00000000-0000-4000-8000-000000000001"


def test_health_identifies_service_without_claiming_database_readiness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "course-service", "status": "ok", "stage": "scaffold", "database": "not_checked"}


def test_docs_and_openapi_are_available():
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "course-service"


def test_unknown_route_has_structured_error():
    response = client.get("/not-a-route")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_error"


def test_invalid_request_is_structured():
    response = client.post("/api/enrollments", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"

def test_demo_courses_and_missing_course():
    data = client.get("/api/courses").json()
    assert data["demo"] is True and len(data["items"]) == 2
    assert client.get("/api/courses/1").json()["course"]["id"] == 1
    assert client.get("/api/courses/999").status_code == 404
    assert client.get("/api/courses/0").status_code == 422


def test_enrollment_is_not_created():
    response = client.post("/api/enrollments", json={"user_id": USER_ID, "course_id": 1})
    assert response.status_code == 501
    assert response.json()["error"]["status"] == "placeholder"
