import { describe, expect, it } from 'vitest'
import { formatDeckCliSnippet } from './deckCliSnippet'

describe('formatDeckCliSnippet', () => {
  it('returns a openflaskcards card list command with the deck id', () => {
    const deckId = '11111111-1111-1111-1111-111111111111'
    expect(formatDeckCliSnippet(deckId)).toBe(
      `openflaskcards card list ${deckId}`,
    )
  })
})
