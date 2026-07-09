-- name: CreateUser :one
INSERT INTO users (email, nickname, name, hashed_password, fsrs_parameters, desired_retention)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByNickname :one
SELECT * FROM users WHERE nickname = $1;

-- name: UpdateUser :one
UPDATE users
SET email = COALESCE(sqlc.narg('email'), email),
    nickname = COALESCE(sqlc.narg('nickname'), nickname),
    name = COALESCE(sqlc.narg('name'), name),
    hashed_password = COALESCE(sqlc.narg('hashed_password'), hashed_password),
    timezone = CASE
        WHEN sqlc.narg('timezone_set')::boolean THEN sqlc.narg('timezone')
        ELSE timezone
    END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserFSRS :one
UPDATE users
SET fsrs_parameters   = COALESCE(sqlc.narg('fsrs_parameters'), fsrs_parameters),
    desired_retention = COALESCE(sqlc.narg('desired_retention'), desired_retention),
    updated_at        = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserOptimizationStatus :one
UPDATE users
SET optimization_status = $2,
    last_optimization = COALESCE(sqlc.narg('last_optimization'), last_optimization),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ClaimOptimizationRun :one
-- Atomic "claim": only succeeds if the user isn't already marked as
-- running, avoiding the race between checking and setting the status
-- across concurrent requests/replicas.
UPDATE users
SET optimization_status = 'running', updated_at = NOW()
WHERE id = $1 AND optimization_status IS DISTINCT FROM 'running'
RETURNING id;

-- name: ResetStaleRunningOptimizations :exec
-- Run once at startup: the in-memory "running" guard is lost on restart, so
-- any row still marked 'running' is orphaned from a crash mid-optimization.
UPDATE users
SET optimization_status = 'failed', updated_at = NOW()
WHERE optimization_status = 'running';

-- name: UpdateUserFSRSAfterOptimization :one
UPDATE users
SET fsrs_parameters = $2,
    desired_retention = $3,
    optimization_status = 'completed',
    last_optimization = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;
