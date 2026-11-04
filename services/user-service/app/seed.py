"""Create explicit demo identities without overwriting existing passwords or roles."""
from uuid import UUID
import argparse
import os

from .core import enabled
from .database import connect
from .security import hasher

DEMO_LEARNER_ID = UUID('00000000-0000-4000-8000-000000000001')
DEMO_ADMIN_ID = UUID('00000000-0000-4000-8000-000000000002')


def seed(reset_passwords=False):
    if not enabled('DEMO_MODE'):
        raise RuntimeError('Demo accounts are disabled outside DEMO_MODE.')
    for role, identity, name in [('learner', DEMO_LEARNER_ID, 'Demo Learner'), ('admin', DEMO_ADMIN_ID, 'Demo Admin')]:
        email = os.environ[f'DEMO_{role.upper()}_EMAIL'].strip().lower()
        password = os.environ[f'DEMO_{role.upper()}_PASSWORD']
        if len(password) < 12 or password.startswith('CHANGE_ME'):
            raise RuntimeError(f'Configure a unique DEMO_{role.upper()}_PASSWORD (12+ characters).')
        with connect() as db:
            existing = db.execute('SELECT id,role FROM users WHERE email=%s', (email,)).fetchone()
            if existing and (existing['id'] != identity or existing['role'] != role):
                raise RuntimeError('Demo identity conflicts with an existing account; no role was changed.')
            if not existing:
                db.execute('INSERT INTO users(id,email,password_hash,role) VALUES (%s,%s,%s,%s)',
                           (identity,email,hasher.hash(password),role))
            elif reset_passwords:
                db.execute('UPDATE users SET password_hash=%s WHERE id=%s', (hasher.hash(password),identity))
            db.execute('INSERT INTO user_profiles(user_id,display_name,self_assessed_level) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING',
                       (identity,name,'A1'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--reset-passwords', action='store_true')
    args = parser.parse_args()
    seed(reset_passwords=args.reset_passwords)
    print('Demo identities processed. Passwords are never printed.')
