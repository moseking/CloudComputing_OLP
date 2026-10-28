"""Independent scaffold; demo reads only, no database queries or authentication yet."""
import os
from typing import Annotated
from uuid import UUID

from fastapi import FastAPI, HTTPException, Path, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from starlette.exceptions import HTTPException as StarletteHTTPException

SERVICE = "course-service"
app = FastAPI(
    title=SERVICE,
    version="0.1.0",
    description="Scaffold: demo reads and explicit 501 placeholders. No business writes.",
    root_path=os.getenv("ROOT_PATH", ""),
)


@app.exception_handler(StarletteHTTPException)
async def http_error(_request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {
        "code": "http_error", "message": str(exc.detail)
    }
    return JSONResponse(status_code=exc.status_code, content={"error": detail}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    # Do not echo submitted passwords, payment data or the request body.
    fields = [{"location": list(e["loc"]), "message": e["msg"], "type": e["type"]}
              for e in exc.errors()]
    return JSONResponse(status_code=422, content={
        "error": {"code": "validation_error", "message": "Invalid request", "fields": fields}
    })


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def pending(feature: str):
    raise HTTPException(status_code=501, detail={
        "code": "not_implemented", "message": f"{feature} is not implemented.",
        "service": SERVICE, "status": "placeholder"
    })


@app.get("/")
def info():
    return {"service": SERVICE, "stage": "scaffold", "business_database_in_use": False}


@app.get("/health")
def health():
    # Liveness only: does not claim PostgreSQL readiness or business readiness.
    return {"service": SERVICE, "status": "ok", "stage": "scaffold", "database": "not_checked"}


PLACEHOLDER = {501: {"description": "Business operation is not implemented"}}

COURSES = [
    {"id": 1, "title": "Nhập môn Điện toán đám mây", "description": "Khóa học demo về VM và container.", "demo": True},
    {"id": 2, "title": "Microservices với FastAPI", "description": "Khóa học demo về REST và Docker Compose.", "demo": True},
]


class EnrollmentRequest(InputModel):
    user_id: UUID
    course_id: int = Field(gt=0)


@app.get("/api/courses")
def list_courses():
    return {"demo": True, "items": COURSES, "total": len(COURSES)}


@app.get("/api/courses/{course_id}")
def course_detail(course_id: Annotated[int, Path(gt=0)]):
    for course in COURSES:
        if course["id"] == course_id:
            return {"demo": True, "course": course}
    raise HTTPException(404, detail={"code": "course_not_found", "message": "Demo course not found"})


@app.post("/api/enrollments", responses=PLACEHOLDER)
def enroll(_body: EnrollmentRequest):
    pending("Course enrollment")
