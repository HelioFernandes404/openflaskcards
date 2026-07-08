export interface Letter {
  id: string
  userId: string
  title: string
  artist: string
  originalLyrics: string
  translation: string
  deckId?: string | null
  createdAt: string
  updatedAt: string
}

export interface LetterCreateInput {
  title: string
  artist?: string
  originalLyrics?: string
  translation?: string
  deckId?: string | null
}

export interface LetterUpdateInput {
  title?: string
  artist?: string
  originalLyrics?: string
  translation?: string
  deckId?: string | null
}
