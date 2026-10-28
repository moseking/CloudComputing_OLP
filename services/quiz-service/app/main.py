"""Independent scaffold; demo reads only, no database queries or authentication yet."""
import os
from typing import Annotated
from uuid import UUID

from fastapi import FastAPI, HTTPException, Path, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from starlette.exceptions import HTTPException as StarletteHTTPException

SERVICE = "quiz-service"
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

class SubmissionRequest(InputModel):
    user_id: UUID
    answers: dict[str, str] = Field(min_length=1, max_length=100)


@app.get("/api/quizzes/{quiz_id}")
def get_quiz(quiz_id: Annotated[int, Path(gt=0)]):
    if quiz_id != 1:
        raise HTTPException(404, detail={"code": "quiz_not_found", "message": "Demo quiz not found"})
    return {"demo": True, "quiz": {
        "id": 1, "course_id": 1, "title": "Kiến thức container (demo)",
        "questions": [{"id": "q1", "text": "Công cụ nào chạy nhiều container từ một tệp cấu hình?",
                       "options": {"a": "Docker Compose", "b": "Git"}}]
    }}


@app.post("/api/quizzes/{quiz_id}/submit", responses=PLACEHOLDER)
def submit(quiz_id: Annotated[int, Path(gt=0)], _body: SubmissionRequest):
    pending("Quiz submission and grading")
