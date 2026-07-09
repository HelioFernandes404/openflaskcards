package auth

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestIsUniqueViolation(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "nil error is not a unique violation",
			err:  nil,
			want: false,
		},
		{
			name: "pgconn.PgError with code 23505 is a unique violation",
			err:  &pgconn.PgError{Code: "23505", Message: "duplicate key value violates unique constraint"},
			want: true,
		},
		{
			name: "wrapped pgconn.PgError with code 23505 is still detected via errors.As",
			err:  fmt.Errorf("insert user: %w", &pgconn.PgError{Code: "23505"}),
			want: true,
		},
		{
			name: "pgconn.PgError with a different code is not a unique violation",
			err:  &pgconn.PgError{Code: "23503", Message: "foreign key violation"},
			want: false,
		},
		{
			name: "generic error whose text merely contains 'duplicate key' is not a unique violation",
			err:  errors.New("some unrelated error mentioning duplicate key in its message"),
			want: false,
		},
		{
			name: "generic error whose text merely contains '23505' is not a unique violation",
			err:  errors.New("code 23505 appears in this unrelated error text"),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isUniqueViolation(tt.err)
			if got != tt.want {
				t.Errorf("isUniqueViolation(%v) = %v, want %v", tt.err, got, tt.want)
			}
		})
	}
}

func TestCreateUserMapsUniqueViolationToAlreadyExists(t *testing.T) {
	// Regression test: a typed *pgconn.PgError with code 23505 must be detected
	// even though it is not asserted through CreateUser directly here (that
	// requires a live DB) - this locks in the type-based detection contract
	// that CreateUser relies on via isUniqueViolation.
	pgErr := &pgconn.PgError{Code: "23505", Message: "duplicate key value violates unique constraint \"users_email_key\""}
	if !isUniqueViolation(pgErr) {
		t.Fatal("expected typed pgconn.PgError with code 23505 to be detected as a unique violation")
	}

	genericErr := errors.New("connection reset: duplicate key mentioned but not a real pg error")
	if isUniqueViolation(genericErr) {
		t.Fatal("expected generic error merely containing 'duplicate key' text to NOT be classified as a unique violation")
	}
}
