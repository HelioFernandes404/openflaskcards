import { describe, expect, it } from 'vitest'
import { sortDecksPinnedFirst } from './deckSort'
import type { Deck } from '@/features/decks/types/deck'

function makeDeck(id: string): Deck {
  return {
    id,
    name: `Deck ${id}`,
    userId: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    newCardsDailyLimit: 10,
  }
}

describe('sortDecksPinnedFirst', () => {
  it('moves pinned decks to the top, preserving original order within each group', () => {
    const decks = [makeDeck('a'), makeDeck('b'), makeDeck('c'), makeDeck('d')]
    const pinned = new Set(['c', 'a'])

    const result = sortDecksPinnedFirst(decks, pinned)

    expect(result.map((d) => d.id)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('returns decks in original order when nothing is pinned', () => {
    const decks = [makeDeck('a'), makeDeck('b')]
    const result = sortDecksPinnedFirst(decks, new Set())
    expect(result.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('returns decks in original order when everything is pinned', () => {
    const decks = [makeDeck('a'), makeDeck('b')]
    const result = sortDecksPinnedFirst(decks, new Set(['a', 'b']))
    expect(result.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the input array', () => {
    const decks = [makeDeck('a'), makeDeck('b')]
    const original = [...decks]
    sortDecksPinnedFirst(decks, new Set(['b']))
    expect(decks).toEqual(original)
  })

  it('handles an empty deck list', () => {
    expect(sortDecksPinnedFirst([], new Set(['a']))).toEqual([])
  })
})
