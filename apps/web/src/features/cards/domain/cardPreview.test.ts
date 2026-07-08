import { describe, expect, it } from 'vitest'
import {
  buildPreviewBack,
  buildPreviewFront,
  cardToEditDraft,
  draftsEqual,
} from './cardPreview'
import type { Card } from '../types/card'

const baseCard: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  front: 'hello',
  back: 'hello',
  fonetica: '/hé-lou/',
  audioUrl: 'https://example.com/audio.mp3',
  stability: 1,
  difficulty: 5,
  due: '2026-01-01',
  state: 'review',
  reps: 3,
  lapses: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ttsEnabled: false,
}

describe('cardPreview', () => {
  it('maps card to edit draft', () => {
    expect(cardToEditDraft(baseCard)).toEqual({
      front: 'hello',
      back: 'hello',
      phonetic: '/hé-lou/',
      imagemUrl: undefined,
    })
  })

  it('builds front preview with image and tts flag', () => {
    const draft = {
      ...cardToEditDraft(baseCard),
      front: 'world',
      imagemUrl: 'https://example.com/image.png',
    }

    expect(buildPreviewFront(baseCard, draft)).toEqual({
      id: 'card-1',
      deckId: 'deck-1',
      front: 'world',
      imagemUrl: 'https://example.com/image.png',
      audioUrl: 'https://example.com/audio.mp3',
      ttsEnabled: false,
      state: 'review',
      reps: 3,
    })
  })

  it('builds back preview from draft fields', () => {
    const draft = {
      front: 'world',
      back: 'mundo',
      phonetic: '/uórld/',
      imagemUrl: 'https://example.com/image.png',
    }

    expect(buildPreviewBack(baseCard, draft).front).toBe('world')
    expect(buildPreviewBack(baseCard, draft).back).toBe('mundo')
    expect(buildPreviewBack(baseCard, draft).phonetic).toBe('/uórld/')
    expect(buildPreviewBack(baseCard, draft).imagemUrl).toBe(
      'https://example.com/image.png',
    )
  })

  it('detects equal drafts', () => {
    const left = cardToEditDraft(baseCard)
    const right = { ...left, imagemUrl: 'https://example.com/a.png' }
    expect(draftsEqual(left, { ...left })).toBe(true)
    expect(draftsEqual(left, right)).toBe(false)
  })
})
