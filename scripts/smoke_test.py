"""Exercise a running gateway; expects honest 501 placeholders, never fake success."""
import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:8080")
args = parser.parse_args()
base = args.base_url.rstrip("/")
uid = "00000000-0000-4000-8000-000000000001"
count = 0

def check(path, expected=200, body=None, verify=None, method=None):
    global count
    payload = json.dumps(body).encode() if body is not None else None
    request = Request(base + path, data=payload, headers={"Content-Type": "application/json"}, method=method)
    try:
        response = urlopen(request, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        data = response.read().decode()
        assert response.status == expected, f"{path}: {response.status} != {expected}: {data}"
        if verify:
            verify(data)
    count += 1
    print(f"PASS {request.get_method()} {path} -> {expected}")

def assert_json(data, key, expected):
    assert json.loads(data)[key] == expected, data

def assert_frontend(data):
    assert '<div id="root">' in data, "Missing frontend"


check("/", verify=assert_frontend)
check("/health", verify=lambda data: assert_json(data, "service", "gateway"))
for slug, service in [("users", "user"), ("courses", "course"), ("quizzes", "quiz"), ("payments", "payment")]:
    check(f"/services/{slug}/health", verify=lambda data, s=service: assert_json(data, "service", s+"-service"))
    check(f"/services/{slug}/docs")
    def schema_check(data, prefix=f"/services/{slug}"):
        schema = json.loads(data)
        assert schema["servers"][0]["url"] == prefix
    check(f"/services/{slug}/openapi.json", verify=schema_check)
check("/api/courses?demo=true", verify=lambda data: assert_json(data, "demo", True))
check("/api/courses/1")
check("/api/courses/999", 404)
check("/api/quizzes/1", verify=lambda data: assert_json(data, "demo", True))
check("/api/quizzes/999", 404)
check("/api/users/register", 501, {"email": "demo@example.com", "password": "demo-only-123", "display_name": "Demo"})
check("/api/users/login", 501, {"email": "demo@example.com", "password": "demo-only-123"})
check("/api/users/me", 501)
check("/api/enrollments", 501, {"user_id": uid, "course_id": 1})
check("/api/quizzes/1/submit", 501, {"user_id": uid, "answers": {"q1": "a"}})
check("/api/payments", 501, {"user_id": uid, "course_id": 1, "amount": 50000})
check(f"/api/payments/{uid}", 501)
check("/api/payments", 422, {"user_id": uid, "course_id": 1, "amount": 0})
check("/api/users/register", 422, {})
check("/api/not-found", 404)
# Swagger 'Try it out' uses the service prefix from OpenAPI's servers field.
check("/services/courses/api/courses")
check("/services/users/api/users/me", 501)
print(f"Gateway smoke test: {count} checks passed")
