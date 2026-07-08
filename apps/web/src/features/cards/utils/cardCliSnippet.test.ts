import { describe, expect, it } from 'vitest'
import { formatCardCliSnippet } from './cardCliSnippet'

describe('formatCardCliSnippet', () => {
  it('returns a openflaskcards card get command with the card id', () => {
    const cardId = '82565f0d-9087-45aa-9fab-7169d4c7487e'
    expect(formatCardCliSnippet(cardId)).toBe(
      `openflaskcards card get ${cardId}`,
    )
  })
})
