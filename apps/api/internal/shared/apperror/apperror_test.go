// apps/api/internal/shared/apperror/apperror_test.go
package apperror

import (
	"errors"
	"testing"
)

func TestAppErrorImplementsError(t *testing.T) {
	var err error = &AppError{Code: "X", Status: 400, Message: "bad"}
	if err.Error() != "X: bad" {
		t.Errorf("Error(): got %q, want %q", err.Error(), "X: bad")
	}
}

func TestIsAppError(t *testing.T) {
	original := ErrCardNotFound
	wrapped := errors.New("outer")

	var ae *AppError
	if !errors.As(original, &ae) {
		t.Fatal("expected errors.As to find AppError in original")
	}
	if ae.Code != "CARD_NOT_FOUND" {
		t.Errorf("Code: got %q, want CARD_NOT_FOUND", ae.Code)
	}

	if errors.As(wrapped, &ae) {
		t.Fatal("did not expect errors.As to find AppError in plain error")
	}
}
