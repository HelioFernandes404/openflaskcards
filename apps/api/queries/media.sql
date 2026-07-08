-- name: CreateMedia :one
INSERT INTO media (
    id, user_id, kind, storage_path, original_filename, content_type, size_bytes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING id, user_id, kind, storage_path, original_filename, content_type, size_bytes, created_at;

-- name: GetMediaByID :one
SELECT id, user_id, kind, storage_path, original_filename, content_type, size_bytes, created_at
FROM media
WHERE id = $1;

-- name: DeleteMedia :exec
DELETE FROM media
WHERE id = $1 AND user_id = $2;

-- name: CountCardsReferencingMediaURL :one
SELECT count(*)
FROM cards
WHERE imagem_url = $1;
