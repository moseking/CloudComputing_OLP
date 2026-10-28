"""Independent scaffold; demo reads only, no database queries or authentication yet."""
import os
from typing import Annotated
from uuid import UUID

from fastapi import FastAPI, HTTPException, Path, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from starlette.exceptions import HTTPException as StarletteHTTPException

SERVICE = "payment-service"
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

class PaymentRequest(InputModel):
    user_id: UUID
    course_id: int = Field(gt=0)
    amount: int = Field(gt=0, le=1_000_000_000, description="Demo amount in whole VND")
    currency: str = Field(default="VND", pattern="^VND$")


@app.post("/api/payments", responses=PLACEHOLDER)
def create_payment(_body: PaymentRequest):
    pending("Simulated payment creation")


@app.get("/api/payments/{payment_id}", responses=PLACEHOLDER)
def get_payment(payment_id: UUID):
    pending("Simulated payment lookup")
