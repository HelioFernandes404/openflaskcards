export interface TestUser {
  email: string
  password: string
  name: string
  nickname?: string
}

export interface TestDeck {
  id: string
  name: string
  description: string
  cardCount: number
  userId: string
}

export interface TestCard {
  id: string
  deckId: string
  front: string
  back: string
  state: 'New' | 'Learning' | 'Review' | 'Relearning'
  stability: number
  difficulty: number
}

export interface RouteMap {
  [key: string]: string
}
