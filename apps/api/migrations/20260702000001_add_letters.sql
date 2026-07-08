-- =============================================================================
-- letters — song lyrics with optional linked vocabulary deck
-- =============================================================================
CREATE TABLE letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL DEFAULT '',
    original_lyrics TEXT NOT NULL DEFAULT '',
    translation TEXT NOT NULL DEFAULT '',
    deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_letters_user_id ON letters (user_id);
CREATE INDEX ix_letters_deck_id ON letters (deck_id);
