#!/usr/bin/env python3
"""Exercise the demo payment and course-unlock flow through the Nginx gateway."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import secrets
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4


ROOT = Path(__file__).resolve().parents[1]


def read_env(path):
    values = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            values[name] = value.strip().strip('"').strip("'")
    return values


class Gateway:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")

    def request(self, method, path, *, body=None, token=None, headers=None, expected=200):
        request_headers = {"Accept": "application/json"}
        if body is not None:
            request_headers["Content-Type"] = "application/json"
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
        request_headers.update(headers or {})
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(self.base_url + path, data=data, headers=request_headers, method=method)
        try:
            with urlopen(request, timeout=15) as response:
                status = response.status
                raw = response.read()
        except HTTPError as error:
            status = error.code
            raw = error.read()
        except URLError as error:
            raise RuntimeError(f"Gateway request failed for {method} {path}: {error.reason}") from error
        if status != expected:
            detail = raw.decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"{method} {path}: expected HTTP {expected}, got {status}: {detail}")
        return json.loads(raw) if raw else {}


def login(gateway, email, password):
    return gateway.request("POST", "/api/users/login", body={"email": email, "password": password})["access_token"]


def register_and_login(gateway, label):
    unique = uuid4().hex
    email = f"payment-flow-{label}-{unique[:12]}@example.test"
    password = secrets.token_urlsafe(24)
    gateway.request("POST", "/api/users/register", expected=201,
                    body={"email": email, "password": password, "display_name": f"Payment Flow {label}"})
    return login(gateway, email, password)


def run(base_url, env_file, output_file):
    env = read_env(env_file)
    if env.get("DEMO_MODE", "").lower() != "true":
        raise RuntimeError("The payment result simulator requires DEMO_MODE=true.")
    admin_email = env.get("DEMO_ADMIN_EMAIL", "")
    admin_password = env.get("DEMO_ADMIN_PASSWORD", "")
    if not admin_email or not admin_password or admin_password.startswith("CHANGE_ME"):
        raise RuntimeError("Set the demo admin credentials in .env before running this script.")

    gateway = Gateway(base_url)
    gateway_health = gateway.request("GET", "/health")
    payment_health = gateway.request("GET", "/services/payments/health")
    if gateway_health.get("status") != "ok" or payment_health.get("status") != "ok":
        raise RuntimeError("Gateway or payment-service health check failed.")

    learner_token = register_and_login(gateway, "success")
    courses = gateway.request("GET", "/api/courses", token=learner_token)["items"]
    paid_course = next((course for course in courses if course.get("price", 0) > 0), None)
    if not paid_course:
        raise RuntimeError("No paid course is available. Start the seeded demo catalog first.")
    admin_token = login(gateway, admin_email, admin_password)

    def create_payment(token):
        response = gateway.request(
            "POST", "/api/payments", expected=201, token=token,
            headers={"Idempotency-Key": str(uuid4())}, body={"course_id": paid_course["id"]},
        )
        transaction = response["transaction"]
        if transaction["status"] != "PENDING":
            raise RuntimeError("New payment did not start as PENDING.")
        return transaction

    success_payment = create_payment(learner_token)
    success_result = gateway.request(
        "POST", f"/api/payments/{success_payment['id']}/simulate-result", token=admin_token,
        body={"scenario": "success"},
    )
    if success_result.get("access_status") != "granted" or success_result["transaction"]["status"] != "SUCCESS":
        raise RuntimeError("SUCCESS did not confirm course access.")
    current_payment = gateway.request("GET", f"/api/payments/{success_payment['id']}", token=learner_token)["transaction"]
    enrollments = gateway.request("GET", "/api/enrollments/my-courses", token=learner_token)["items"]
    if current_payment["status"] != "SUCCESS" or not current_payment["enrollment_confirmed"]:
        raise RuntimeError("Payment status or enrollment confirmation was not persisted.")
    if not any(row["course_id"] == paid_course["id"] for row in enrollments):
        raise RuntimeError("The paid course is absent from the learner's access list.")

    failed_learner_token = register_and_login(gateway, "failure")
    failed_payment = create_payment(failed_learner_token)
    failed_result = gateway.request(
        "POST", f"/api/payments/{failed_payment['id']}/simulate-result", token=admin_token,
        body={"scenario": "failure"},
    )
    failed_current = gateway.request("GET", f"/api/payments/{failed_payment['id']}", token=failed_learner_token)["transaction"]
    failed_enrollments = gateway.request("GET", "/api/enrollments/my-courses", token=failed_learner_token)["items"]
    if failed_result["transaction"]["status"] != "FAILED" or failed_current["status"] != "FAILED":
        raise RuntimeError("Failure simulation did not persist FAILED.")
    if any(row["course_id"] == paid_course["id"] for row in failed_enrollments):
        raise RuntimeError("A FAILED payment unexpectedly granted course access.")

    result = {
        "status": "passed",
        "base_url": base_url.rstrip("/"),
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "gateway_health": gateway_health["status"],
            "payment_service_health": payment_health["status"],
            "created_payment_status": "PENDING",
            "success_payment_status": current_payment["status"],
            "success_access_status": success_result["access_status"],
            "success_enrollment_confirmed": current_payment["enrollment_confirmed"],
            "failed_payment_status": failed_current["status"],
            "failed_payment_granted_access": False,
        },
        "course_id": paid_course["id"],
        "success_payment_id": success_payment["id"],
        "failed_payment_id": failed_payment["id"],
    }
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS: gateway and payment-service health are OK")
    print("PASS: payment starts PENDING, becomes SUCCESS, and course access is granted")
    print("PASS: separate payment becomes FAILED without granting course access")
    print(f"Sample result saved to {output_file}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8080")
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env")
    parser.add_argument("--output", type=Path, default=ROOT / "docs" / "payment-flow-sample.json")
    args = parser.parse_args()
    try:
        run(args.base_url, args.env_file, args.output)
    except (OSError, RuntimeError, KeyError, ValueError) as error:
        raise SystemExit(f"FAIL: {error}") from error
