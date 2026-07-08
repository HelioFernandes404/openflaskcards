// Full Card interface with all fields
export interface Card {
  id: string
  deckId: string

  // Content fields (renamed for Active Recall clarity)
  front: string // Word/phrase in English
  back: string // Translation/definition

  // Active Recall fields
  audioUrl?: string // Pronunciation audio URL
  imagemUrl?: string // Context image URL
  fonetica?: string // Brazilian-readable phonetics (NOT IPA)

  // FSRS fields
  stability: number
  difficulty: number
  due: string
  lastReview?: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  reps: number
  lapses: number

  // Timestamps
  createdAt: string
  updatedAt: string

  // TTS settings
  ttsEnabled: boolean
  ttsAudio?: string // Base64 encoded MP3 audio
}

// Card Front Response (Challenge - no spoilers)
// Shows front and imagemUrl; NEVER includes fonetica, back, ttsAudio
export interface CardFront {
  id: string
  deckId: string
  front: string
  imagemUrl?: string
  audioUrl?: string
  ttsEnabled: boolean
  state: 'new' | 'learning' | 'review' | 'relearning'
  reps: number
}

// Review Submission Response — the API only returns the updated FSRS
// state, not the full card (no id/deckId/front/back).
export interface ReviewResult {
  cardId: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  stability: number
  difficulty: number
  due: string
  lastReview?: string
  reps: number
  lapses: number
}

// Card Back Response (Feedback - complete solution)
export interface CardBack {
  id: string
  deckId: string
  front: string
  audioUrl?: string
  fonetica?: string
  back: string
  imagemUrl?: string
  ttsAudio?: string
  stability: number
  difficulty: number
  due: string
  lastReview?: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  reps: number
  lapses: number
}

// Card Create Input
export interface CardCreateInput {
  deckId: string
  front: string
  back: string
  audioUrl?: string
  imagemUrl?: string
  fonetica?: string
  ttsEnabled?: boolean
}

// Card Update Input
export interface CardUpdateInput {
  front?: string
  back?: string
  audioUrl?: string
  imagemUrl?: string
  fonetica?: string
  ttsEnabled?: boolean
}

// Due Cards Summary Response (includes daily new cards quota metadata)
export interface DueCardsSummary {
  cards: CardFront[]
  totalDue: number
  newCardsDailyLimit: number
  newCardsStudiedToday: number
  remainingNewCardsToday: number
  isNewCardsLimitReached: boolean
}
