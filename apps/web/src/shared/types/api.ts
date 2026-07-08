export interface User {
  id: string
  nickname: string
  name?: string
  email: string
  isEmailVerified: boolean
  provider: string | null
  providers: string[] | null
  fsrsParameters: number[]
  desiredRetention: number
  optimizationStatus: string | null
  lastOptimization: string | null
  timezone: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewPreviewOption {
  rating: 1 | 2 | 3 | 4
  ratingName: 'Again' | 'Hard' | 'Good' | 'Easy'
  intervalDays: number
  intervalString: string
  due: string
  stability: number
  difficulty: number
}

export interface ReviewPreview {
  cardId: string
  currentRetrievability: number
  options: ReviewPreviewOption[]
}

export interface GlobalStats {
  timeStudied: string
  timeStudiedTrend?: string
  totalReviews: number
  totalCards: number
  newCardsToday: number
  retentionRate: string
}
