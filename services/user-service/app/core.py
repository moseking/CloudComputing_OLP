"""Service-local HTTP, JWT verification, error handling and lifecycle helpers."""
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID
import hmac
import logging
import os

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
import jwt
import psycopg
from pydantic import BaseModel, ConfigDict, StringConstraints
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import database

Level = Literal['A1', 'A2', 'B1', 'B2', 'C1']
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
bearer = HTTPBearer(auto_error=False)


class InputModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


def fail(status, code, message):
    raise HTTPException(status_code=status, detail={'code': code, 'message': message})


def enabled(name):
    return os.getenv(name, 'false').lower() == 'true'


def public_key():
    return Path(os.environ['JWT_PUBLIC_KEY_PATH']).read_text(encoding='utf-8')


def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if credentials is None:
        fail(401, 'authentication_required', 'Vui lòng đăng nhập.')
    try:
        claims = jwt.decode(
            credentials.credentials, public_key(), algorithms=['RS256'],
            issuer=os.getenv('JWT_ISSUER', 'oelp-users'), audience=os.getenv('JWT_AUDIENCE', 'oelp'),
            options={'require': ['sub', 'role', 'exp', 'iat', 'nbf', 'iss', 'aud']},
        )
        identity = UUID(claims['sub'])
        if claims['role'] not in ('learner', 'admin'):
            raise ValueError('Invalid role')
    except (jwt.InvalidTokenError, ValueError, KeyError):
        fail(401, 'invalid_token', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.')
    except OSError:
        fail(503, 'auth_configuration_error', 'Dịch vụ xác thực chưa sẵn sàng.')
    return {'id': identity, 'role': claims['role']}


Actor = Annotated[dict, Depends(current_user)]


def admin_user(actor: Actor):
    if actor['role'] != 'admin':
        fail(403, 'admin_required', 'Chức năng này chỉ dành cho Admin.')
    return actor


Admin = Annotated[dict, Depends(admin_user)]


def service_guard(environment_name):
    def authorize(x_service_token: Annotated[str | None, Header()] = None):
        expected = os.getenv(environment_name, '')
        if not expected or expected.startswith('CHANGE_ME'):
            fail(503, 'service_auth_configuration_error', 'Chưa cấu hình xác thực liên service.')
        if not x_service_token or not hmac.compare_digest(expected, x_service_token):
            fail(403, 'service_auth_required', 'Yêu cầu xác thực liên service hợp lệ.')
    return authorize


def call_course(path, token_name, *, method='GET', body=None, params=None):
    token = os.getenv(token_name, '')
    if not token or token.startswith('CHANGE_ME'):
        fail(503, 'service_auth_configuration_error', 'Chưa cấu hình xác thực liên service.')
    base = os.getenv('COURSE_SERVICE_URL', 'http://course-service:8000').rstrip('/')
    try:
        with httpx.Client(timeout=5, trust_env=False) as client:
            response = client.request(method, base + path, json=body, params=params,
                                      headers={'X-Service-Token': token})
    except httpx.RequestError:
        fail(503, 'course_service_unavailable', 'Course Service chưa sẵn sàng. Vui lòng thử lại.')
    try:
        data = response.json()
    except ValueError:
        fail(503, 'course_service_unavailable', 'Course Service trả phản hồi không hợp lệ.')
    if response.status_code >= 400:
        if response.status_code in (403, 503):
            fail(503, 'course_service_unavailable', 'Không xác minh được thông tin với Course Service.')
        error = data.get('error', {})
        fail(response.status_code, error.get('code', 'course_request_failed'),
             error.get('message', 'Không thể xử lý yêu cầu khóa học.'))
    return data


def create_app(service, seed=None):
    @asynccontextmanager
    async def lifespan(_app):
        public_key()  # Fail startup on missing keys, never fall back to unsigned tokens.
        database.migrate()
        if seed and enabled('SEED_DEMO'):
            if not enabled('DEMO_MODE'):
                raise RuntimeError('SEED_DEMO requires DEMO_MODE=true.')
            seed()
        yield

    app = FastAPI(title=service, version='1.0.0', root_path=os.getenv('ROOT_PATH', ''), lifespan=lifespan)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_request, exc):
        detail = exc.detail if isinstance(exc.detail, dict) else {'code': 'http_error', 'message': str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content={'error': detail}, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError):
        fields = [{'location': list(e['loc']), 'message': e['msg'], 'type': e['type']} for e in exc.errors()]
        return JSONResponse(status_code=422, content={'error': {
            'code': 'validation_error', 'message': 'Dữ liệu gửi lên chưa hợp lệ.', 'fields': fields}})

    @app.exception_handler(psycopg.Error)
    async def database_error(_request, exc):
        logging.getLogger(service).error('Database operation failed: %s', type(exc).__name__)
        return JSONResponse(status_code=503, content={'error': {
            'code': 'database_unavailable', 'message': 'Không thể xử lý dữ liệu. Vui lòng thử lại.'}})

    @app.get('/')
    def info():
        return {'service': service, 'product': 'OELP', 'version': '1.0.0', 'business_database_in_use': True}

    @app.get('/health')
    def health():
        return {'service': service, 'status': 'ok', 'version': '1.0.0', 'database': 'not_checked'}

    @app.get('/ready')
    def ready():
        with database.connect() as db:
            db.execute('SELECT 1')
        return {'service': service, 'status': 'ok', 'database': 'ready'}

    return app
