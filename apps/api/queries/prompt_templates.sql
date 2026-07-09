-- apps/api/queries/prompt_templates.sql

-- name: CreatePromptTemplate :one
INSERT INTO prompt_templates (user_id, name, body)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPromptTemplateByID :one
SELECT * FROM prompt_templates WHERE id = $1;

-- name: ListPromptTemplatesByUser :many
SELECT * FROM prompt_templates
WHERE user_id = $1
ORDER BY updated_at DESC;

-- name: UpdatePromptTemplate :one
UPDATE prompt_templates
SET name = COALESCE(sqlc.narg('name'), name),
    body = COALESCE(sqlc.narg('body'), body),
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeletePromptTemplate :exec
DELETE FROM prompt_templates WHERE id = $1 AND user_id = $2;
