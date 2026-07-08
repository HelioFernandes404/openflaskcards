package auth

import (
	"context"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

func (s *Service) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	hash := HashRefreshToken(refreshToken)
	rec, err := s.repo.GetRefreshToken(ctx, hash)
	if err != nil {
		return TokenPair{}, apperror.ErrInvalidToken
	}
	if time.Now().UTC().After(rec.ExpiresAt) {
		_ = s.repo.DeleteRefreshToken(ctx, hash)
		return TokenPair{}, apperror.ErrInvalidToken
	}
	u, err := s.repo.GetUserByID(ctx, rec.UserID)
	if err != nil {
		return TokenPair{}, apperror.ErrInvalidToken
	}
	access, refresh, refreshHash, err := s.generateTokenMaterial(u)
	if err != nil {
		return TokenPair{}, err
	}
	if err := s.repo.RotateRefreshToken(ctx, hash, CreateRefreshTokenParams{
		UserID:    u.ID,
		TokenHash: refreshHash,
		ExpiresAt: time.Now().UTC().AddDate(0, 0, s.refreshTTLDays),
	}); err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    s.jwt.TTLSeconds(),
	}, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	return s.repo.DeleteRefreshToken(ctx, HashRefreshToken(refreshToken))
}

func (s *Service) LogoutAll(ctx context.Context, userID uuid.UUID) error {
	return s.repo.DeleteAllRefreshTokensForUser(ctx, userID)
}

func (s *Service) issueTokens(ctx context.Context, u User, deviceInfo string) (TokenPair, error) {
	access, refresh, refreshHash, err := s.generateTokenMaterial(u)
	if err != nil {
		return TokenPair{}, err
	}
	var dev *string
	if deviceInfo != "" {
		dev = &deviceInfo
	}
	if err := s.repo.CreateRefreshToken(ctx, CreateRefreshTokenParams{
		UserID:     u.ID,
		TokenHash:  refreshHash,
		ExpiresAt:  time.Now().UTC().AddDate(0, 0, s.refreshTTLDays),
		DeviceInfo: dev,
	}); err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    s.jwt.TTLSeconds(),
	}, nil
}

func (s *Service) generateTokenMaterial(u User) (access, refresh, refreshHash string, err error) {
	access, err = s.jwt.Sign(u.ID, u.Email)
	if err != nil {
		return "", "", "", err
	}
	refresh, refreshHash, err = GenerateRefreshToken()
	if err != nil {
		return "", "", "", err
	}
	return access, refresh, refreshHash, nil
}
