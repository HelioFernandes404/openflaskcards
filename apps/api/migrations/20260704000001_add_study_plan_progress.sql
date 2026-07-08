-- Persist study plan progress (sessions, XP, streaks) per plan on the server.
ALTER TABLE study_plans
    ADD COLUMN progress JSONB NOT NULL DEFAULT '{"sessions":{},"totalXp":0,"longestStreak":0}';
