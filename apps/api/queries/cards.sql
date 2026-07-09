-- name: CreateCard :one
INSERT INTO cards (
    deck_id, front, back, audio_url, imagem_url, fonetica,
    tts_enabled, state, stability, difficulty, due, fsrs_card_json
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetCardByID :one
SELECT * FROM cards WHERE id = $1;

-- name: ListCardsByDeck :many
SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at DESC;

-- name: ListDueCardsByDeck :many
-- Ranks 'new' cards by due date and drops any beyond sqlc.arg(max_new_cards)
-- BEFORE applying LIMIT/OFFSET, so pagination reflects exactly what the
-- caller is allowed to consume (see CountDueCardsByDeck for the matching
-- total). Non-new cards are never capped by this rank.
WITH ranked AS (
    SELECT *,
        CASE
            WHEN state = 'new' THEN ROW_NUMBER() OVER (PARTITION BY (state = 'new') ORDER BY due ASC)
            ELSE 0
        END AS new_rank
    FROM cards
    WHERE deck_id = $1 AND due <= $2
)
SELECT id, deck_id, front, back, audio_url, imagem_url, fonetica, tts_enabled, stability, difficulty, due, last_review, state, reps, lapses, fsrs_card_json, row_version, created_at, updated_at
FROM ranked
WHERE state != 'new' OR new_rank <= sqlc.arg(max_new_cards)::bigint
ORDER BY due ASC
LIMIT $3 OFFSET $4;

-- name: CountDueCardsByDeck :one
-- Mirrors the new-card cap applied in ListDueCardsByDeck so TotalDue
-- matches what pagination can actually return.
WITH ranked AS (
    SELECT state,
        CASE
            WHEN state = 'new' THEN ROW_NUMBER() OVER (PARTITION BY (state = 'new') ORDER BY due ASC)
            ELSE 0
        END AS new_rank
    FROM cards
    WHERE deck_id = $1 AND due <= $2
)
SELECT COUNT(*)::bigint FROM ranked
WHERE state != 'new' OR new_rank <= sqlc.arg(max_new_cards)::bigint;

-- name: ListDueCardsByUser :many
SELECT c.* FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1 AND c.due <= $2
ORDER BY c.due ASC
LIMIT $3 OFFSET $4;

-- name: CountNewCardsStudiedToday :one
SELECT COUNT(DISTINCT r.card_id) FROM reviews r
JOIN cards c ON c.id = r.card_id
WHERE c.deck_id = $1
  AND r.user_id = $2
  AND r.review_datetime >= $3
  AND r.elapsed_days = 0;

-- name: DeckStatsByUser :many
SELECT
    d.id AS deck_id,
    d.new_cards_daily_limit,
    COALESCE(SUM(CASE WHEN c.state = 'new' THEN 1 ELSE 0 END), 0)::bigint AS new_count,
    COALESCE(SUM(CASE WHEN (c.state = 'learning' OR c.state = 'relearning') AND c.due <= $2 THEN 1 ELSE 0 END), 0)::bigint AS learning_count,
    COALESCE(SUM(CASE WHEN c.state = 'review' AND c.due <= $2 THEN 1 ELSE 0 END), 0)::bigint AS review_count,
    COALESCE(COUNT(c.id), 0)::bigint AS total_cards,
    COALESCE(st.studied_today, 0)::bigint AS new_cards_studied_today
FROM decks d
LEFT JOIN cards c ON c.deck_id = d.id
LEFT JOIN (
    SELECT c2.deck_id, COUNT(DISTINCT r.card_id) AS studied_today
    FROM reviews r
    JOIN cards c2 ON c2.id = r.card_id
    WHERE r.user_id = $1
      AND r.review_datetime >= sqlc.arg('start_of_day')
      AND r.elapsed_days = 0
    GROUP BY c2.deck_id
) st ON st.deck_id = d.id
WHERE d.user_id = $1
GROUP BY d.id, d.new_cards_daily_limit, st.studied_today
ORDER BY d.created_at DESC;

-- name: CountCardsByDeck :one
SELECT COUNT(*) FROM cards WHERE deck_id = $1;

-- name: UpdateCard :one
UPDATE cards
SET front = COALESCE(sqlc.narg('front'), front),
    back = COALESCE(sqlc.narg('back'), back),
    audio_url = COALESCE(sqlc.narg('audio_url'), audio_url),
    imagem_url = COALESCE(sqlc.narg('imagem_url'), imagem_url),
    fonetica = COALESCE(sqlc.narg('fonetica'), fonetica),
    tts_enabled = COALESCE(sqlc.narg('tts_enabled'), tts_enabled),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateCardAfterReview :one
UPDATE cards
SET state = $2,
    stability = $3,
    difficulty = $4,
    due = $5,
    last_review = $6,
    reps = $7,
    lapses = $8,
    fsrs_card_json = $9,
    row_version = row_version + 1,
    updated_at = NOW()
WHERE id = $1 AND row_version = $10
RETURNING *;

-- name: DeleteCard :exec
DELETE FROM cards WHERE id = $1;

-- name: MoveCard :one
UPDATE cards
SET deck_id = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListReviewsByUserForOptimizer :many
SELECT card_id, rating, review_datetime
FROM reviews
WHERE user_id = $1
ORDER BY card_id, review_datetime ASC;

-- name: CreateReview :one
INSERT INTO reviews (
    card_id, user_id, rating, state, scheduled_days, elapsed_days,
    review_datetime, review_duration_ms, stability, difficulty
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: CountUserCards :one
SELECT COUNT(*)::bigint
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1;

-- name: CountUserCardsByState :many
SELECT c.state, COUNT(*)::bigint AS count
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1
GROUP BY c.state;

-- name: CountUserCardsDueBy :one
SELECT COUNT(*)::bigint
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1
  AND c.due <= $2;

-- name: CountUserCardsCreatedSince :one
SELECT COUNT(*)::bigint
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1
  AND c.created_at >= $2;

-- name: CountUserCardsEditedSince :one
SELECT COUNT(*)::bigint
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1
  AND c.updated_at >= $2
  AND c.created_at < $2;

-- name: CountUserCardsInUntaggedDecks :one
SELECT COUNT(*)::bigint
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = $1
  AND (d.tags IS NULL OR cardinality(d.tags) = 0);

-- name: BrowseUserCards :many
SELECT c.*
FROM cards c
JOIN decks d ON d.id = c.deck_id
WHERE d.user_id = sqlc.arg(user_id)
  AND (sqlc.narg(state)::text IS NULL OR c.state = sqlc.narg(state))
  AND (sqlc.narg(deck_id)::uuid IS NULL OR c.deck_id = sqlc.narg(deck_id))
  AND (sqlc.narg(due_before)::timestamptz IS NULL OR c.due <= sqlc.narg(due_before))
  AND (sqlc.narg(created_after)::timestamptz IS NULL OR c.created_at >= sqlc.narg(created_after))
  AND (
    sqlc.narg(edited_after)::timestamptz IS NULL
    OR (c.updated_at >= sqlc.narg(edited_after) AND c.created_at < sqlc.narg(edited_after))
  )
  AND (
    sqlc.narg(untagged_only)::boolean IS NULL
    OR sqlc.narg(untagged_only) = FALSE
    OR (d.tags IS NULL OR cardinality(d.tags) = 0)
  )
ORDER BY c.created_at DESC;
