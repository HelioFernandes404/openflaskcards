-- apps/api/queries/kanban_cards.sql

-- name: CreateKanbanCard :one
INSERT INTO kanban_cards (user_id, title, description, status, priority, assignee, position, type)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetKanbanCardByID :one
SELECT * FROM kanban_cards WHERE id = $1;

-- name: ListKanbanCardsByUser :many
SELECT * FROM kanban_cards
WHERE user_id = $1
ORDER BY CASE status
    WHEN 'backlog' THEN 0
    WHEN 'todo' THEN 1
    WHEN 'in_progress' THEN 2
    WHEN 'done' THEN 3
END, position ASC;

-- name: ListKanbanCardsByUserAndStatus :many
SELECT * FROM kanban_cards
WHERE user_id = $1 AND status = $2
ORDER BY position ASC;

-- name: MaxPositionForStatus :one
SELECT COALESCE(MAX(position), -1)::int AS max_position
FROM kanban_cards
WHERE user_id = $1 AND status = $2;

-- name: NextTodoCardForUser :one
SELECT * FROM kanban_cards
WHERE user_id = $1 AND status = 'todo'
ORDER BY position ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- name: UpdateKanbanCard :one
UPDATE kanban_cards
SET title = COALESCE(sqlc.narg('title'), title),
    description = COALESCE(sqlc.narg('description'), description),
    status = COALESCE(sqlc.narg('status'), status),
    priority = COALESCE(sqlc.narg('priority'), priority),
    assignee = COALESCE(sqlc.narg('assignee'), assignee),
    position = COALESCE(sqlc.narg('position'), position),
    type = COALESCE(sqlc.narg('type'), type),
    verification_note = COALESCE(sqlc.narg('verification_note'), verification_note),
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeleteKanbanCard :exec
DELETE FROM kanban_cards WHERE id = $1 AND user_id = $2;
