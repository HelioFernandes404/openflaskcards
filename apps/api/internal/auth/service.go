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

type CreatePasswordResetTokenParams struct {
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
}

type PasswordResetTokenRecord struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// Mailer is the minimal email-sending capability the auth package needs. It
// mirrors internal/shared/mailer.Sender's signature so main.go can pass that
// implementation in directly without this package importing it.
type Mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

type Repository interface {
	CreateUser(ctx context.Context, p CreateUserParams) (User, error)
	GetUserByEmail(ctx context.Context, email string) (User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (User, error)
	CreateRefreshToken(ctx context.Context, p CreateRefreshTokenParams) error
	DeleteRefreshToken(ctx context.Context, hash string) error
	DeleteAllRefreshTokensForUser(ctx context.Context, userID uuid.UUID) error
	// RedeemRefreshToken atomically deletes the token identified by hash and
	// returns the row that was deleted. It must return apperror.ErrInvalidToken
	// when no row was deleted, so concurrent callers redeeming the same hash
	// can't both succeed — only the first delete affects a row.
	RedeemRefreshToken(ctx context.Context, hash string) (RefreshTokenRecord, error)

	// Password reset
	CreatePasswordResetToken(ctx context.Context, p CreatePasswordResetTokenParams) error
	GetPasswordResetTokenByHash(ctx context.Context, hash string) (PasswordResetTokenRecord, error)
	MarkPasswordResetTokenUsed(ctx context.Context, id uuid.UUID) error
	UpdateUserPassword(ctx context.Context, userID uuid.UUID, hashedPassword string) error
}

type Service struct {
	repo              Repository
	jwt               *JWTManager
	refreshTTLDays    int
	defaultFSRSParams []float64
	defaultRetention  float64
	mailer            Mailer
	webBaseURL        string
	resetTTL          time.Duration
}

// ServiceOption configures optional Service dependencies (password reset
// email delivery) without changing NewService's signature for callers that
// don't need them (e.g. existing tests using the fake repo).
type ServiceOption func(*Service)

// WithPasswordReset wires the mailer and base web URL needed to send
// password reset emails, and the TTL a reset token stays valid for.
func WithPasswordReset(mailer Mailer, webBaseURL string, ttl time.Duration) ServiceOption {
	return func(s *Service) {
		s.mailer = mailer
		s.webBaseURL = webBaseURL
		s.resetTTL = ttl
	}
}

func NewService(repo Repository, jwt *JWTManager, refreshTTLDays int, opts ...ServiceOption) *Service {
	defaultWeights := []float64{
		0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
		1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
		2.9898, 0.51655, 0.6621, 0.0, 0.0,
	}
	s := &Service{
		repo:              repo,
		jwt:               jwt,
		refreshTTLDays:    refreshTTLDays,
		defaultFSRSParams: defaultWeights,
		defaultRetention:  0.9,
		resetTTL:          30 * time.Minute,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
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
