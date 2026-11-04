"""Connections and additive, versioned migrations for this service's own database."""
import hashlib
import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


def connect():
    password = os.environ.get('DB_PASSWORD', '')
    if not password or password.startswith('CHANGE_ME'):
        raise RuntimeError('Configure DB_PASSWORD before starting the service.')
    return psycopg.connect(
        host=os.getenv('DB_HOST', 'postgres'), port=int(os.getenv('DB_PORT', '5432')),
        dbname=os.environ['DB_NAME'], user=os.environ['DB_USER'], password=password,
        connect_timeout=5, row_factory=dict_row,
        options='-c statement_timeout=10000 -c lock_timeout=10000',
    )


def migrate():
    directory = Path(__file__).resolve().parents[1] / 'migrations'
    with connect() as db:
        db.execute("SELECT pg_advisory_xact_lock(218723, 1)")
        db.execute('''CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY, checksum TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now())''')
        for path in sorted(directory.glob('*.sql')):
            # Normalize LF/CRLF so the same migration works across Windows and Linux checkouts.
            text = path.read_text(encoding='utf-8')
            checksum = hashlib.sha256(text.encode('utf-8')).hexdigest()
            previous = db.execute('SELECT checksum FROM schema_migrations WHERE version=%s', (path.name,)).fetchone()
            if previous:
                if previous['checksum'] != checksum:
                    raise RuntimeError(f'Applied migration changed: {path.name}. Add a new migration instead.')
                continue
            db.execute(text, prepare=False)
            db.execute('INSERT INTO schema_migrations(version,checksum) VALUES (%s,%s)', (path.name,checksum))


if __name__ == '__main__':
    migrate()
    print('Migrations applied successfully to this service database.')
