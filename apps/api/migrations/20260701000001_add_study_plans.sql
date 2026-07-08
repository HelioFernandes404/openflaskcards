-- =============================================================================
-- study_plans
-- =============================================================================
CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    level VARCHAR(255) NOT NULL DEFAULT '',
    goal VARCHAR(255) NOT NULL DEFAULT '',
    golden_rule TEXT NOT NULL DEFAULT '',
    flexibility TEXT NOT NULL DEFAULT '',
    no_fixed_deadline BOOLEAN NOT NULL DEFAULT true,
    steps JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_study_plans_user_id ON study_plans (user_id);
