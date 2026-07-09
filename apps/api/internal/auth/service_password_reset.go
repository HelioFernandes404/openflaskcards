package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
)

// RequestPasswordReset issues a password reset token for the given email and
// emails it to the user, if an account with that email exists. It never
// returns an error for "user not found" (nor does it indicate that case in
// any other observable way) so callers can't use this endpoint to enumerate
// which emails have an account.
func (s *Service) RequestPasswordReset(ctx context.Context, email string) error {
	u, err := s.repo.GetUserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return nil
		}
		return err
	}

	token, hash, err := GenerateRefreshToken()
	if err != nil {
		return fmt.Errorf("password reset: generate token: %w", err)
	}

	if err := s.repo.CreatePasswordResetToken(ctx, CreatePasswordResetTokenParams{
		UserID:    u.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().UTC().Add(s.resetTTL),
	}); err != nil {
		return fmt.Errorf("password reset: store token: %w", err)
	}

	if s.mailer == nil {
		return nil
	}

	link := fmt.Sprintf("%s/reset-password?token=%s", s.webBaseURL, token)
	body := fmt.Sprintf(
		"We received a request to reset your OpenFlashcards password.\n\n"+
			"Reset it here (valid for %d minutes): %s\n\n"+
			"If you didn't request this, you can safely ignore this email.",
		int(s.resetTTL.Minutes()), link,
	)
	if err := s.mailer.Send(ctx, u.Email, "Reset your OpenFlashcards password", body); err != nil {
		return fmt.Errorf("password reset: send email: %w", err)
	}
	return nil
}

// ResetPassword redeems a password reset token, sets the new password, and
// revokes all of the user's existing refresh tokens/sessions — a password
// reset is exactly the situation an attacker with an old session should not
// survive.
func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	hash := HashRefreshToken(token)
	rec, err := s.repo.GetPasswordResetTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, apperror.ErrInvalidToken) {
			return apperror.ErrInvalidToken
		}
		return err
	}
	if rec.UsedAt != nil || time.Now().UTC().After(rec.ExpiresAt) {
		return apperror.ErrInvalidToken
	}

	hashedPassword, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	if err := s.repo.UpdateUserPassword(ctx, rec.UserID, hashedPassword); err != nil {
		return fmt.Errorf("password reset: update password: %w", err)
	}
	if err := s.repo.MarkPasswordResetTokenUsed(ctx, rec.ID); err != nil {
		return fmt.Errorf("password reset: mark token used: %w", err)
	}
	if err := s.repo.DeleteAllRefreshTokensForUser(ctx, rec.UserID); err != nil {
		return fmt.Errorf("password reset: revoke sessions: %w", err)
	}
	return nil
}
