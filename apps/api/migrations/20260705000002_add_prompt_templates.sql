-- =============================================================================
-- prompt_templates
-- =============================================================================
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT prompt_templates_user_name_unique UNIQUE (user_id, name)
);
CREATE INDEX idx_prompt_templates_user_id ON prompt_templates (user_id);
