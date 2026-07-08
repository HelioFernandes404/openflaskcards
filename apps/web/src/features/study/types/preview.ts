export interface ReviewPreviewOption {
  rating: 1 | 2 | 3 | 4
  ratingName: 'Again' | 'Hard' | 'Good' | 'Easy'
  intervalDays: number
  intervalString: string
  due: string
  stability: number
  difficulty: number
}

export interface ReviewPreviewResponse {
  cardId: string
  currentRetrievability: number
  options: ReviewPreviewOption[]
}
