-- apps/api/queries/modules.sql

-- name: CreateModule :one
INSERT INTO modules (user_id, name, description, sort_order, prompt_module_type_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetModuleByID :one
SELECT * FROM modules WHERE id = $1;

-- name: ListModulesByUser :many
SELECT * FROM modules
WHERE user_id = $1
ORDER BY sort_order ASC, name ASC;

-- name: UpdateModule :one
UPDATE modules
SET name = COALESCE(sqlc.narg('name'), name),
    description = COALESCE(sqlc.narg('description'), description),
    sort_order = COALESCE(sqlc.narg('sort_order'), sort_order),
    prompt_module_type_id = COALESCE(sqlc.narg('prompt_module_type_id'), prompt_module_type_id),
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeleteModule :exec
DELETE FROM modules WHERE id = $1 AND user_id = $2;
