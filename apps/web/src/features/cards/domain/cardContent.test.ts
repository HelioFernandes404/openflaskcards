import { describe, expect, it } from 'vitest'
import type { Card } from '../types/card'
import { buildCardFrontFromCard } from './cardContent'

const baseCard: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  front: 'scalability',
  back: 'escalabilidade',
  stability: 1,
  difficulty: 5,
  due: '2026-06-19T00:00:00Z',
  state: 'new',
  reps: 0,
  lapses: 0,
  createdAt: '2026-06-19T00:00:00Z',
  updatedAt: '2026-06-19T00:00:00Z',
  ttsEnabled: true,
}

describe('buildCardFrontFromCard', () => {
  it('maps cards with front text, image, and tts flag', () => {
    const front = buildCardFrontFromCard({
      ...baseCard,
      imagemUrl: '/api/v1/media/img-1',
    })

    expect(front).toEqual({
      id: 'card-1',
      deckId: 'deck-1',
      front: 'scalability',
      imagemUrl: '/api/v1/media/img-1',
      ttsEnabled: true,
      state: 'new',
      reps: 0,
    })
  })

  it('includes audioUrl when present', () => {
    const front = buildCardFrontFromCard({
      ...baseCard,
      audioUrl: '/api/v1/media/audio-1',
      imagemUrl: '/api/v1/media/img-2',
    })

    expect(front).toEqual({
      id: 'card-1',
      deckId: 'deck-1',
      front: 'scalability',
      audioUrl: '/api/v1/media/audio-1',
      imagemUrl: '/api/v1/media/img-2',
      ttsEnabled: true,
      state: 'new',
      reps: 0,
    })
  })

  it('omits imagemUrl when the card has no image', () => {
    const front = buildCardFrontFromCard(baseCard)
    expect(front.imagemUrl).toBeUndefined()
  })
})
