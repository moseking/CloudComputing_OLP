CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    display_name VARCHAR(150) NOT NULL,
    bio VARCHAR(500) NOT NULL DEFAULT '',
    self_assessed_level VARCHAR(2) CHECK (self_assessed_level IN ('A1','A2','B1','B2','C1'))
);
CREATE TABLE user_language_preferences (
    user_id UUID NOT NULL REFERENCES users(id),
    language_code VARCHAR(12) NOT NULL,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1')),
    PRIMARY KEY(user_id, language_code)
);
