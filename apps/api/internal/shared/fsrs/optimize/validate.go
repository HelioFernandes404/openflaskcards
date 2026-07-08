package optimize

import (
	"errors"
	"fmt"
)

// ValidateRows ensures there is enough review history before calling the sidecar.
func ValidateRows(rows []ReviewRow) error {
	if len(rows) < MinReviewRows {
		return fmt.Errorf("%w: need at least %d review rows, got %d", ErrInsufficientData, MinReviewRows, len(rows))
	}
	return nil
}

// IsInsufficientData reports whether an optimizer error indicates too little data.
func IsInsufficientData(err error) bool {
	return errors.Is(err, ErrInsufficientData)
}
