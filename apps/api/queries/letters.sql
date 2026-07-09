-- apps/api/queries/letters.sql

-- name: CreateLetter :one
INSERT INTO letters (user_id, title, artist, original_lyrics, translation, deck_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetLetterByID :one
SELECT * FROM letters WHERE id = $1;

-- name: ListLettersByUser :many
SELECT * FROM letters WHERE user_id = $1 ORDER BY updated_at DESC;

-- name: UpdateLetter :one
UPDATE letters
SET title = COALESCE(sqlc.narg('title'), title),
    artist = COALESCE(sqlc.narg('artist'), artist),
    original_lyrics = COALESCE(sqlc.narg('original_lyrics'), original_lyrics),
    translation = COALESCE(sqlc.narg('translation'), translation),
    deck_id = CASE
        WHEN sqlc.narg('deck_id_set')::boolean THEN sqlc.narg('deck_id')
        ELSE deck_id
    END,
    updated_at = NOW()
WHERE id = $1 AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeleteLetter :exec
DELETE FROM letters WHERE id = $1 AND user_id = $2;
