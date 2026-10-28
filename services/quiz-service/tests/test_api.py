from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
USER_ID = "00000000-0000-4000-8000-000000000001"


def test_health_identifies_service_without_claiming_database_readiness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"service": "quiz-service", "status": "ok", "stage": "scaffold", "database": "not_checked"}


def test_docs_and_openapi_are_available():
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "quiz-service"


def test_unknown_route_has_structured_error():
    response = client.get("/not-a-route")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_error"


def test_invalid_request_is_structured():
    response = client.post("/api/quizzes/1/submit", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"

def test_demo_quiz_does_not_expose_correct_answers():
    response = client.get("/api/quizzes/1")
    assert response.status_code == 200 and response.json()["demo"] is True
    question = response.json()["quiz"]["questions"][0]
    assert "correct_answer" not in question
    assert client.get("/api/quizzes/999").status_code == 404


def test_submission_is_not_graded():
    body = {"user_id": USER_ID, "answers": {"q1": "a"}}
    assert client.post("/api/quizzes/1/submit", json=body).status_code == 501
    assert client.post("/api/quizzes/1/submit", json={**body, "answers": {}}).status_code == 422
