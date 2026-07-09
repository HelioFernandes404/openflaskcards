// apps/api/internal/shared/apperror/apperror.go
package apperror

import "fmt"

type AppError struct {
	Code    string
	Status  int
	Message string
}

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func New(code string, status int, message string) *AppError {
	return &AppError{Code: code, Status: status, Message: message}
}

// Pre-defined domain errors
var (
	ErrCardNotFound           = &AppError{Code: "CARD_NOT_FOUND", Status: 404, Message: "card not found"}
	ErrDeckNotFound           = &AppError{Code: "DECK_NOT_FOUND", Status: 404, Message: "deck not found"}
	ErrModuleNotFound         = &AppError{Code: "MODULE_NOT_FOUND", Status: 404, Message: "module not found"}
	ErrNoteNotFound           = &AppError{Code: "NOTE_NOT_FOUND", Status: 404, Message: "note not found"}
	ErrPromptTemplateNotFound = &AppError{Code: "PROMPT_TEMPLATE_NOT_FOUND", Status: 404, Message: "prompt template not found"}
	ErrLetterNotFound         = &AppError{Code: "LETTER_NOT_FOUND", Status: 404, Message: "letter not found"}
	ErrStudyPlanNotFound      = &AppError{Code: "STUDY_PLAN_NOT_FOUND", Status: 404, Message: "study plan not found"}
	ErrKanbanCardNotFound     = &AppError{Code: "KANBAN_CARD_NOT_FOUND", Status: 404, Message: "kanban card not found"}
	ErrNoTodoCards            = &AppError{Code: "NO_TODO_CARDS", Status: 404, Message: "no cards available in To Do"}
	ErrUserNotFound           = &AppError{Code: "USER_NOT_FOUND", Status: 404, Message: "user not found"}
	ErrUserAlreadyExists      = &AppError{Code: "USER_ALREADY_EXISTS", Status: 400, Message: "user already exists"}
	ErrInvalidCredentials     = &AppError{Code: "INVALID_CREDENTIALS", Status: 401, Message: "invalid credentials"}
	ErrInvalidToken           = &AppError{Code: "INVALID_TOKEN", Status: 401, Message: "invalid token"}
	ErrUnauthorized           = &AppError{Code: "UNAUTHORIZED", Status: 401, Message: "unauthorized"}
	ErrForbidden              = &AppError{Code: "FORBIDDEN", Status: 403, Message: "forbidden"}
	ErrRowVersionConflict     = &AppError{Code: "ROW_VERSION_CONFLICT", Status: 409, Message: "row version conflict"}
	ErrDailyNewCardsLimit     = &AppError{Code: "DAILY_NEW_CARDS_LIMIT", Status: 409, Message: "Daily new cards limit reached for this deck today"}
	ErrValidation             = &AppError{Code: "VALIDATION_ERROR", Status: 422, Message: "validation error"}
	ErrEmailAlreadyInUse      = &AppError{Code: "EMAIL_ALREADY_IN_USE", Status: 409, Message: "email already in use"}
	ErrNicknameAlreadyInUse   = &AppError{Code: "NICKNAME_ALREADY_IN_USE", Status: 409, Message: "nickname already in use"}

	ErrMediaNotFound        = &AppError{Code: "MEDIA_NOT_FOUND", Status: 404, Message: "media not found"}
	ErrMediaTooLarge        = &AppError{Code: "MEDIA_TOO_LARGE", Status: 413, Message: "image exceeds max size"}
	ErrUnsupportedMediaType = &AppError{Code: "UNSUPPORTED_MEDIA_TYPE", Status: 415, Message: "unsupported image type"}
	ErrMediaInUse           = &AppError{Code: "MEDIA_IN_USE", Status: 409, Message: "media is referenced by one or more cards"}
)
