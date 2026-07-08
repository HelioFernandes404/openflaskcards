-- =============================================================================
-- kanban_cards.type
-- =============================================================================
ALTER TABLE kanban_cards
    ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'feature'
        CHECK (type IN ('bug', 'feature', 'tech_debt', 'chore'));

-- All cards created before this migration were produced by the automated
-- bug-scan loop, so they are factually bugs regardless of column/status.
UPDATE kanban_cards SET type = 'bug';
