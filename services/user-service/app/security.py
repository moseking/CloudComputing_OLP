from datetime import datetime, timedelta, timezone
from pathlib import Path
import os
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
import jwt

hasher = PasswordHasher()
dummy_hash = hasher.hash(secrets.token_urlsafe(32))


def verify_password(encoded, plaintext):
    try:
        return hasher.verify(encoded, plaintext)
    except (VerificationError, InvalidHashError):
        return False


def issue_token(user):
    now = datetime.now(timezone.utc)
    lifetime = int(os.getenv('JWT_TTL_SECONDS', '3600'))
    payload = {'sub': str(user['id']), 'role': user['role'], 'iat': now, 'nbf': now,
               'exp': now + timedelta(seconds=lifetime), 'iss': os.getenv('JWT_ISSUER', 'oelp-users'),
               'aud': os.getenv('JWT_AUDIENCE', 'oelp')}
    private = Path(os.environ['JWT_PRIVATE_KEY_PATH']).read_text(encoding='utf-8')
    return jwt.encode(payload, private, algorithm='RS256'), lifetime
