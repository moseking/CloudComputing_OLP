CREATE TABLE transactions (
    id UUID PRIMARY KEY, user_id UUID NOT NULL, course_id INTEGER NOT NULL CHECK (course_id>0),
    course_title VARCHAR(150) NOT NULL, amount BIGINT NOT NULL CHECK (amount>0),
    currency VARCHAR(3) NOT NULL CHECK (currency='VND'),
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED')),
    idempotency_key UUID NOT NULL, enrollment_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id,idempotency_key)
);
CREATE TABLE payment_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES transactions(id),
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('PENDING','SUCCESS','FAILED','ENROLLMENT_GRANTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(payment_id,event_type)
);
CREATE INDEX transactions_user_idx ON transactions(user_id,created_at DESC);
