"""User Service: authoritative identities, RS256 access tokens and learner profiles."""
from uuid import uuid4
from typing import Annotated

from fastapi import Body
from psycopg.errors import UniqueViolation
from pydantic import Field, SecretStr, StringConstraints, field_validator

from .core import Actor, InputModel, Level, Name, create_app, fail
from .database import connect
from .security import dummy_hash, hasher, issue_token, verify_password
from .seed import seed

app = create_app('user-service', seed)
Email = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3,
                                        max_length=254, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')]


class RegisterRequest(InputModel):
    email: Email
    password: SecretStr = Field(min_length=8, max_length=128)
    display_name: Name


class LoginRequest(InputModel):
    email: Email
    password: SecretStr = Field(min_length=1, max_length=128)


class LanguagePreference(InputModel):
    language_code: str = Field(pattern=r'^[a-z]{2}(?:-[A-Z]{2})?$')
    level: Level


class ProfileRequest(InputModel):
    display_name: Name
    bio: str = Field(default='', max_length=500)
    self_assessed_level: Level | None = None
    language_preferences: list[LanguagePreference] = Field(default_factory=list, max_length=20)

    @field_validator('language_preferences')
    @classmethod
    def unique_languages(cls, values):
        if len({v.language_code for v in values}) != len(values):
            raise ValueError('Mỗi ngôn ngữ chỉ được khai báo một lần.')
        return values


def profile(identity):
    with connect() as db:
        row = db.execute('''SELECT u.id,u.email,u.role,u.created_at,p.display_name,p.bio,p.self_assessed_level
                            FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.id=%s''', (identity,)).fetchone()
        if not row:
            fail(401, 'user_not_found', 'Tài khoản không còn tồn tại.')
        row['language_preferences'] = db.execute(
            'SELECT language_code,level FROM user_language_preferences WHERE user_id=%s ORDER BY language_code', (identity,)).fetchall()
    return row


@app.post('/api/users/register', status_code=201)
def register(body: RegisterRequest):
    identity = uuid4()
    try:
        with connect() as db:
            db.execute('INSERT INTO users(id,email,password_hash,role) VALUES (%s,%s,%s,%s)',
                       (identity,body.email,hasher.hash(body.password.get_secret_value()),'learner'))
            db.execute('INSERT INTO user_profiles(user_id,display_name) VALUES (%s,%s)', (identity,body.display_name))
    except UniqueViolation:
        fail(409, 'email_exists', 'Email đã được đăng ký.')
    return {'user': profile(identity)}


@app.post('/api/users/login')
def login(body: LoginRequest):
    with connect() as db:
        row = db.execute('SELECT id,role,password_hash FROM users WHERE email=%s', (body.email,)).fetchone()
        valid = verify_password(row['password_hash'] if row else dummy_hash, body.password.get_secret_value())
        if not row or not valid:
            fail(401, 'invalid_credentials', 'Email hoặc mật khẩu chưa đúng.')
        if hasher.check_needs_rehash(row['password_hash']):
            db.execute('UPDATE users SET password_hash=%s WHERE id=%s', (hasher.hash(body.password.get_secret_value()),row['id']))
    token, lifetime = issue_token(row)
    return {'access_token': token, 'token_type': 'bearer', 'expires_in': lifetime, 'user': profile(row['id'])}


@app.get('/api/users/me')
def me(actor: Actor):
    return {'user': profile(actor['id'])}


@app.put('/api/users/me')
def update_profile(body: ProfileRequest, actor: Actor):
    with connect() as db:
        updated = db.execute('UPDATE user_profiles SET display_name=%s,bio=%s,self_assessed_level=%s WHERE user_id=%s RETURNING user_id',
                             (body.display_name,body.bio,body.self_assessed_level,actor['id'])).fetchone()
        if not updated:
            fail(401, 'user_not_found', 'Tài khoản không còn tồn tại.')
        db.execute('DELETE FROM user_language_preferences WHERE user_id=%s', (actor['id'],))
        for preference in body.language_preferences:
            db.execute('INSERT INTO user_language_preferences(user_id,language_code,level) VALUES (%s,%s,%s)',
                       (actor['id'],preference.language_code,preference.level))
    return {'user': profile(actor['id'])}
