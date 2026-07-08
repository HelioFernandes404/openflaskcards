-- =============================================================================
-- modules.prompt_module_type_id — image prompt template for Prompt Help
-- =============================================================================
ALTER TABLE modules
    ADD COLUMN prompt_module_type_id VARCHAR(64) NOT NULL DEFAULT 'visual-vocabulary';
