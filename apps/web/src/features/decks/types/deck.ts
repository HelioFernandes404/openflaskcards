export interface Deck {
  id: string
  name: string
  description?: string
  tags?: string[]
  moduleId?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  // Daily new cards limit (0-200, default 10)
  newCardsDailyLimit: number
  // Stats from /decks/stats endpoint
  newCount?: number
  learnCount?: number
  reviewCount?: number
  totalCards?: number
  // Daily quota info
  newCardsStudiedToday?: number
  // UI-only fields
  lastReviewed?: string
  accentColor?: string
}

export interface DeckCreateInput {
  name: string
  description?: string
  tags?: string[]
  moduleId?: string | null
  newCardsDailyLimit?: number
}

export interface DeckUpdateInput {
  name?: string
  description?: string
  tags?: string[]
  moduleId?: string | null
  newCardsDailyLimit?: number
}
