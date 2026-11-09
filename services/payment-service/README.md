# Payment Service

Payment Service is a FastAPI service for simulated course purchases. It stores transaction metadata in its own PostgreSQL database (`payment_db`), verifies the shared RS256 access tokens, and never accepts or stores card numbers, CVV values, or real payment credentials.

## API

All `/api` routes require `Authorization: Bearer <access_token>` unless noted. A newly created payment belongs to the authenticated user; the client cannot choose its price, owner, or initial status.

| Method and path | Purpose |
| --- | --- |
| `POST /api/payments` | Create a simulated payment in `PENDING` state. Requires `Idempotency-Key: <UUID>` and JSON `{"course_id": 2}`. |
| `GET /api/payments/{id}` | Read a transaction owned by the caller; admins may read any transaction. |
| `GET /api/payments/my-transactions` | List the caller's transaction history. |
| `GET /health` | Liveness check; does not claim that PostgreSQL is ready. |
| `GET /ready` | Readiness check, including a database connection. Used by Compose health checks. |
| `POST /api/payments/{id}/simulate-result` | Demo-only, admin-only result simulation; JSON `{"scenario":"success"}` or `{"scenario":"failure"}`. |

Create response example:

```json
{
  "transaction": {
    "id": "<payment UUID>",
    "course_id": 2,
    "amount": 149000,
    "currency": "VND",
    "status": "PENDING"
  },
  "replayed": false
}
```

The server asks Course Service for the current course price and enrollment status. Free courses and courses the user already owns cannot be purchased. A repeated idempotency key for the same user and course returns the original transaction; reusing it for a different course is rejected.

## Transaction states and course access

New transactions start as `PENDING`. In demo mode, an administrator can set the terminal state to `SUCCESS` or `FAILED`. A failed transaction does not grant access. On success, Payment Service persists `SUCCESS` first, then sends an authenticated, idempotent confirmation to Course Service. Course Service validates the course price and currency before recording the receipt and enrollment. Access is reported as granted only after that confirmation succeeds. If Course Service is unavailable, the payment remains `SUCCESS` with confirmation pending; retry the same success simulation to safely redeliver the callback.

## Environment and security

Compose supplies these settings to the container:

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Payment database connection; Compose sets the database name to `payment_db`. |
| `JWT_PUBLIC_KEY_PATH` | Path to the shared public RS256 key mounted as a Docker secret. |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Must match the values used by User Service when it signs access tokens. |
| `PAYMENT_SERVICE_TOKEN` | Shared secret for authenticated Payment Service to Course Service calls. |
| `COURSE_SERVICE_URL` | Internal Docker URL for Course Service; defaults to `http://course-service:8000`. |
| `ROOT_PATH` | Public diagnostic prefix used by Nginx, set to `/services/payments`. |
| `DEMO_MODE` | Enables result simulation only when set to `true`. |

The repository `.env` contains PostgreSQL credentials, service-to-service tokens, demo account credentials, gateway binding, and `OELP_SECRET_DIR`. Do not commit it. Generate it and the RSA key pair from the repository root with `bash scripts/setup-env.sh`. Compose mounts the same public key into User, Course, Quiz, and Payment Services; only User Service receives the private signing key. Keep both key files under the ignored `.secrets/` directory.

## Run and verify

From the repository root:

```sh
bash scripts/setup-env.sh
# On EC2, edit .env: NGINX_BIND_ADDRESS=0.0.0.0
docker compose up -d --build
docker compose ps
python3 scripts/test-payment-flow.py
```

The flow script creates throwaway learner accounts, checks the gateway and service health endpoints, confirms a successful payment unlocks a paid course, and confirms a failed payment does not unlock access. It saves a redacted sample result to `docs/payment-flow-sample.json` by default. It requires a seeded demo catalog, `DEMO_MODE=true`, and working demo admin credentials in `.env`.
