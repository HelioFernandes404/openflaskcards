-- apps/api/queries/notes.sql

-- name: CreateNote :one
INSERT INTO notes (user_id, title, content)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetNoteByID :one
SELECT * FROM notes WHERE id = $1;

-- name: ListNotesByUser :many
SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC;

-- name: UpdateNote :one
UPDATE notes
SET title = COALESCE(sqlc.narg('title'), title),
    content = COALESCE(sqlc.narg('content'), content),
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeleteNote :exec
DELETE FROM notes WHERE id = $1 AND user_id = $2;
