package modules

import (
	"fmt"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
)

const DefaultPromptModuleTypeID = "visual-vocabulary"

var validPromptModuleTypeIDs = map[string]struct{}{
	"visual-vocabulary": {},
	"idiom":             {},
	"phrasal-verb":      {},
	"context-scene":     {},
	"abstract-concept":  {},
	"listening":         {},
	"grammar-pattern":   {},
}

func normalizePromptModuleTypeID(value *string) (string, error) {
	if value == nil || *value == "" {
		return DefaultPromptModuleTypeID, nil
	}
	if _, ok := validPromptModuleTypeIDs[*value]; !ok {
		return "", apperror.New(
			"VALIDATION_ERROR",
			422,
			fmt.Sprintf("invalid promptModuleTypeId: %s", *value),
		)
	}
	return *value, nil
}
