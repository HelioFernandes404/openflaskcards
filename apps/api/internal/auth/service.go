package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

// normalizeEmail matches the DB-level LOWER(email) unique index, so the same
// mailbox can't register twice under different casing/whitespace.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

type User struct {
	ID                 uuid.UUID
	Email              string
	Nickname           string
	Name               *string
	HashedPassword     string
	IsEmailVerified    bool
	Provider           *string
	Providers          []string
	FSRSParameters     []float64
	DesiredRetention   float64
	OptimizationStatus *string
	LastOptimization   *string
	Timezone           *string
	CreatedAt          string
	UpdatedAt          string
}

type RefreshTokenRecord struct {
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
}

type CreateUserParams struct {
	Email            string
	Nickname         string
	Name             *string
	HashedPassword   string
	FSRSParameters   []float64
	DesiredRetention float64
}

type CreateRefreshTokenParams struct {
	UserID     uuid.UUID
	TokenHash  string
	ExpiresAt  time.Time
	DeviceInfo *string
}

type Repository interface {
	CreateUser(ctx context.Context, p CreateUserParams) (User, error)
	GetUserByEmail(ctx context.Context, email string) (User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (User, error)
	CreateRefreshToken(ctx context.Context, p CreateRefreshTokenParams) error
	GetRefreshToken(ctx context.Context, hash string) (RefreshTokenRecord, error)
	DeleteRefreshToken(ctx context.Context, hash string) error
	DeleteAllRefreshTokensForUser(ctx context.Context, userID uuid.UUID) error
	// RotateRefreshToken atomically deletes oldHash and creates the new
	// token record, so a mid-rotation failure never leaves the caller
	// without a valid refresh token.
	RotateRefreshToken(ctx context.Context, oldHash string, p CreateRefreshTokenParams) error
}

type Service struct {
	repo              Repository
	jwt               *JWTManager
	refreshTTLDays    int
	defaultFSRSParams []float64
	defaultRetention  float64
}

func NewService(repo Repository, jwt *JWTManager, refreshTTLDays int) *Service {
	defaultWeights := []float64{
		0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
		1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
		2.9898, 0.51655, 0.6621, 0.0, 0.0,
	}
	return &Service{
		repo:              repo,
		jwt:               jwt,
		refreshTTLDays:    refreshTTLDays,
		defaultFSRSParams: defaultWeights,
		defaultRetention:  0.9,
	}
}

type RegisterInput struct {
	Email    string
	Nickname string
	Name     string
	Password string
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int
}

// Register creates the user and immediately issues a token pair, matching
// Login's behavior — a freshly registered user is already authenticated.
func (s *Service) Register(ctx context.Context, in RegisterInput, deviceInfo string) (User, TokenPair, error) {
	hash, err := HashPassword(in.Password)
	if err != nil {
		return User{}, TokenPair{}, err
	}
	var name *string
	if in.Name != "" {
		name = &in.Name
	}
	u, err := s.repo.CreateUser(ctx, CreateUserParams{
		Email:            normalizeEmail(in.Email),
		Nickname:         in.Nickname,
		Name:             name,
		HashedPassword:   hash,
		FSRSParameters:   s.defaultFSRSParams,
		DesiredRetention: s.defaultRetention,
	})
	if err != nil {
		return User{}, TokenPair{}, err
	}
	tok, err := s.issueTokens(ctx, u, deviceInfo)
	if err != nil {
		return User{}, TokenPair{}, err
	}
	return u, tok, nil
}

func (s *Service) Login(ctx context.Context, email, password, deviceInfo string) (TokenPair, error) {
	u, err := s.repo.GetUserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return TokenPair{}, apperror.ErrInvalidCredentials
		}
		return TokenPair{}, err
	}
	if !VerifyPassword(u.HashedPassword, password) {
		return TokenPair{}, apperror.ErrInvalidCredentials
	}
	return s.issueTokens(ctx, u, deviceInfo)
}

func (s *Service) GetUser(ctx context.Context, id uuid.UUID) (User, error) {
	return s.repo.GetUserByID(ctx, id)
}

func (s *Service) JWT() *JWTManager {
	return s.jwt
}
