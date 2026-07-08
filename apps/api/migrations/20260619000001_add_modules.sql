-- =============================================================================
-- modules
-- =============================================================================
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_modules_user_id ON modules (user_id);

ALTER TABLE decks
    ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

CREATE INDEX ix_decks_module_id ON decks (module_id);
