-- apps/api/queries/study_plans.sql

-- name: CreateStudyPlan :one
INSERT INTO study_plans (user_id, title, level, goal, golden_rule, flexibility, no_fixed_deadline, steps)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetStudyPlanByID :one
SELECT * FROM study_plans WHERE id = $1;

-- name: ListStudyPlansByUser :many
SELECT * FROM study_plans WHERE user_id = $1 ORDER BY updated_at DESC;

-- name: UpdateStudyPlan :one
UPDATE study_plans
SET title = COALESCE(sqlc.narg('title'), title),
    level = COALESCE(sqlc.narg('level'), level),
    goal = COALESCE(sqlc.narg('goal'), goal),
    golden_rule = COALESCE(sqlc.narg('golden_rule'), golden_rule),
    flexibility = COALESCE(sqlc.narg('flexibility'), flexibility),
    no_fixed_deadline = COALESCE(sqlc.narg('no_fixed_deadline'), no_fixed_deadline),
    steps = COALESCE(sqlc.narg('steps'), steps),
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: UpdateStudyPlanProgress :one
UPDATE study_plans
SET progress = $2,
    updated_at = NOW()
WHERE id = $1 AND user_id = $3
RETURNING *;

-- name: DeleteStudyPlan :exec
DELETE FROM study_plans WHERE id = $1 AND user_id = $2;
