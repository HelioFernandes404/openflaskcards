package optimize

import "errors"

var ErrInsufficientData = errors.New("insufficient review history for FSRS optimization")

const (
	StatusIdle             = "idle"
	StatusRunning          = "running"
	StatusCompleted        = "completed"
	StatusInsufficientData = "insufficient_data"
	StatusFailed           = "failed"
)
