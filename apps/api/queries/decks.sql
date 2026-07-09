-- apps/api/queries/decks.sql

-- name: CreateDeck :one
INSERT INTO decks (user_id, name, description, tags, new_cards_daily_limit, module_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetDeckByID :one
SELECT * FROM decks WHERE id = $1;

-- name: GetDeckByIDForUpdate :one
-- Locks the deck row so a concurrent review submission can't read the same
-- new-cards-studied-today count before this transaction commits its update.
SELECT * FROM decks WHERE id = $1 FOR UPDATE;

-- name: ListDecksByUser :many
SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateDeck :one
UPDATE decks
SET name = COALESCE(sqlc.narg('name'), name),
    description = COALESCE(sqlc.narg('description'), description),
    tags = COALESCE(sqlc.narg('tags'), tags),
    new_cards_daily_limit = COALESCE(sqlc.narg('new_cards_daily_limit'), new_cards_daily_limit),
    module_id = CASE
        WHEN sqlc.narg('module_id_set')::boolean THEN sqlc.narg('module_id')
        ELSE module_id
    END,
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeleteDeck :exec
DELETE FROM decks WHERE id = $1 AND user_id = $2;
