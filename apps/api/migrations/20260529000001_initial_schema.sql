CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- users
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    hashed_password VARCHAR(255),
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    provider VARCHAR(50) DEFAULT 'email',
    providers TEXT[] DEFAULT ARRAY['email'],
    fsrs_parameters DOUBLE PRECISION[] NOT NULL,
    desired_retention DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    optimization_status VARCHAR(50),
    last_optimization TIMESTAMPTZ,
    timezone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE UNIQUE INDEX ix_users_nickname ON users (nickname);

-- =============================================================================
-- refresh_tokens
-- =============================================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_info VARCHAR(255)
);
CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- =============================================================================
-- decks
-- =============================================================================
CREATE TABLE decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    new_cards_daily_limit INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_decks_user_id ON decks (user_id);

-- =============================================================================
-- cards
-- =============================================================================
CREATE TYPE cardtype AS ENUM ('reading', 'listening');

CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    texto VARCHAR(5000) NOT NULL,
    significado VARCHAR(5000) NOT NULL,
    audio_url TEXT,
    imagem_url TEXT,
    fonetica TEXT,
    card_type cardtype NOT NULL DEFAULT 'reading',
    tts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    stability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    difficulty DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_review TIMESTAMPTZ,
    state VARCHAR(50) NOT NULL DEFAULT 'new',
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    fsrs_card_json TEXT,
    row_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_cards_deck_id ON cards (deck_id);
CREATE INDEX ix_cards_due ON cards (due);

-- =============================================================================
-- reviews
-- =============================================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL,
    state VARCHAR(50) NOT NULL,
    scheduled_days INT NOT NULL,
    elapsed_days INT NOT NULL,
    review_datetime TIMESTAMPTZ NOT NULL,
    review_duration_ms INT,
    stability DOUBLE PRECISION NOT NULL,
    difficulty DOUBLE PRECISION NOT NULL
);
CREATE INDEX ix_reviews_card_id ON reviews (card_id);
CREATE INDEX ix_reviews_user_id ON reviews (user_id);
