import {
  AbortError,
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './apiErrors'

const TECHNICAL_ERROR_PATTERNS = [
  /cannot read properties/i,
  /cannot set properties/i,
  /_retry(count)?/i,
  /\bundefined\b/i,
  /\bnull\b/i,
  /\btypeerror\b/i,
  /\breferenceerror\b/i,
]

const DAILY_LIMIT_MESSAGE = 'Daily new cards limit reached for this deck today'

function firstValidationMessage(error: ValidationError): string | undefined {
  const fieldErrors = error.validationErrors
  if (!fieldErrors) return undefined
  for (const messages of Object.values(fieldErrors)) {
    const firstMessage = messages[0]
    if (firstMessage) return firstMessage
  }
  return undefined
}

function isTechnicalMessage(message: string): boolean {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

interface UserFacingErrorOptions {
  fallbackKey: string
  /** English fallback map keyed by i18n key (used when fallbackKey is an i18n key). */
  fallback?: string
}

/**
 * Maps well-known error types to user-facing English strings.
 * No longer depends on i18n — strings are hardcoded in English.
 */
export function getUserFacingErrorMessage(
  error: unknown,
  options: UserFacingErrorOptions | { t: unknown; fallbackKey: string },
): string {
  // Accept legacy `{ t, fallbackKey }` shape during migration (t is ignored).
  const fallbackKey = (options as UserFacingErrorOptions).fallbackKey

  if (error instanceof ValidationError) {
    const message = firstValidationMessage(error)
    if (message) return message
  }

  if (error instanceof AbortError) {
    return resolveKey(fallbackKey)
  }

  if (error instanceof NetworkError) {
    return "Can't reach the server. Check your connection and try again."
  }

  if (error instanceof TimeoutError) {
    return 'The request took too long. Please try again.'
  }

  if (error instanceof ServerError) {
    return "The server couldn't complete your request. Please try again."
  }

  if (error instanceof AuthorizationError) {
    return "You don't have permission to do that."
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 409 && error.message === DAILY_LIMIT_MESSAGE) {
      return 'Daily new cards limit reached! This review was not saved.'
    }

    if (isTechnicalMessage(error.message)) {
      return 'Something went wrong. Please try again.'
    }

    if (error instanceof AuthenticationError || error.statusCode === 401) {
      return resolveKey(fallbackKey)
    }

    if (error.statusCode === 409) {
      return "This action couldn't be completed right now. Please refresh and try again."
    }

    return resolveKey(fallbackKey)
  }

  if (error instanceof Error) {
    if (isTechnicalMessage(error.message)) {
      return 'Something went wrong. Please try again.'
    }
  }

  return resolveKey(fallbackKey)
}

/** Resolves a dotted i18n key or plain string to a reasonable English sentence. */
function resolveKey(key: string): string {
  const FALLBACK_MAP: Record<string, string> = {
    'dashboard:errors.loadDecks': "Couldn't load your decks. Please try again.",
    'dashboard:errors.createDeck':
      "Couldn't create the deck. Please try again.",
    'dashboard:errors.updateDeck':
      "Couldn't update the deck. Please try again.",
    'dashboard:errors.deleteDeck':
      "Couldn't delete the deck. Please try again.",
    'dashboard:errors.addCard': "Couldn't add the card. Please try again.",
    'dashboard:errors.updateCard':
      "Couldn't update the card. Please try again.",
    'dashboard:errors.deleteCard':
      "Couldn't delete the card. Please try again.",
    'dashboard:errors.submitReview':
      "Couldn't save your review. Please try again.",
    'dashboard:errors.loadDueCards':
      "Couldn't load due cards. Please try again.",
    'dashboard:errors.loadDueSummary':
      "Couldn't load the study summary. Please try again.",
    'dashboard:errors.loadCardBack':
      "Couldn't load the card answer. Please try again.",
    'dashboard:errors.loadCardFront':
      "Couldn't load the card front. Please try again.",
    'dashboard:errors.loadReviewPreview':
      "Couldn't load the review preview. Please try again.",
    'dashboard:errors.loadNotes': "Couldn't load your notes. Please try again.",
    'dashboard:errors.loadNote': "Couldn't load the note. Please try again.",
    'dashboard:errors.createNote':
      "Couldn't create the note. Please try again.",
    'dashboard:errors.updateNote':
      "Couldn't update the note. Please try again.",
    'dashboard:errors.deleteNote':
      "Couldn't delete the note. Please try again.",
    'dashboard:errors.loadPromptTemplates':
      "Couldn't load your prompt templates. Please try again.",
    'dashboard:errors.createPromptTemplate':
      "Couldn't save the prompt template. Please try again.",
    'dashboard:errors.updatePromptTemplate':
      "Couldn't update the prompt template. Please try again.",
    'dashboard:errors.deletePromptTemplate':
      "Couldn't delete the prompt template. Please try again.",
    'dashboard:errors.loadStudyPlans':
      "Couldn't load your study plans. Please try again.",
    'dashboard:errors.loadStudyPlan':
      "Couldn't load the study plan. Please try again.",
    'dashboard:errors.createStudyPlan':
      "Couldn't create the study plan. Please try again.",
    'dashboard:errors.updateStudyPlan':
      "Couldn't update the study plan. Please try again.",
    'dashboard:errors.deleteStudyPlan':
      "Couldn't delete the study plan. Please try again.",
    'dashboard:errors.loadKanbanCards':
      "Couldn't load the kanban board. Please try again.",
    'dashboard:errors.createKanbanCard':
      "Couldn't create the card. Please try again.",
    'dashboard:errors.updateKanbanCard':
      "Couldn't update the card. Please try again.",
    'dashboard:errors.deleteKanbanCard':
      "Couldn't delete the card. Please try again.",
    'shared:errors.readSelection':
      "Couldn't read the selected text. Please try again.",
  }
  return FALLBACK_MAP[key] ?? 'Something went wrong. Please try again.'
}
