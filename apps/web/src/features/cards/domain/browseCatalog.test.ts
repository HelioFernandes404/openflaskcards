import { describe, expect, it } from 'vitest'
import type { Card } from '@/features/cards/types/card'
import {
  applyBrowseFilters,
  buildEditorSnapshot,
  buildImageSavePayload,
  buildTextSavePayload,
  buildTtsSavePayload,
  filterCardsBySearch,
  hasActiveBrowseFilters,
  resolveSelection,
  resolveQuickCreateDeckId,
  shouldRefetchOnFilterChange,
  sortCards,
  toggleSortColumn,
} from './browseCatalog'

const cardA: Card = {
  id: 'a',
  deckId: 'deck-1',
  front: 'Apple',
  back: 'Apple',
  stability: 1,
  difficulty: 1,
  due: '2024-01-01',
  state: 'new',
  reps: 0,
  lapses: 0,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  ttsEnabled: false,
}

const cardB: Card = {
  ...cardA,
  id: 'b',
  deckId: 'deck-2',
  front: 'Banana',
  back: 'Banana',
  state: 'review',
}

describe('browseCatalog', () => {
  it('filterCardsBySearch matches front and back case-insensitively', () => {
    expect(filterCardsBySearch([cardA, cardB], 'apple')).toEqual([cardA])
    expect(filterCardsBySearch([cardA, cardB], 'BANANA')).toEqual([cardB])
  })

  it('sortCards orders by column and direction', () => {
    const deckNames = (deckId: string) =>
      deckId === 'deck-1' ? 'Alpha' : 'Beta'

    expect(
      sortCards([cardB, cardA], 'front', 'asc', deckNames).map((c) => c.id),
    ).toEqual(['a', 'b'])

    expect(
      sortCards([cardA, cardB], 'front', 'desc', deckNames).map((c) => c.id),
    ).toEqual(['b', 'a'])

    expect(
      sortCards([cardA, cardB], 'deck', 'asc', deckNames).map((c) => c.id),
    ).toEqual(['a', 'b'])
  })

  it('resolveSelection keeps valid selection or falls back to first card', () => {
    expect(resolveSelection([cardA, cardB], 'b')).toBe('b')
    expect(resolveSelection([cardA, cardB], 'missing')).toBe('a')
    expect(resolveSelection([], 'a')).toBeNull()
  })

  it('resolveQuickCreateDeckId prefers deck filter, then selection, then first deck', () => {
    const decks = [{ id: 'deck-1' }, { id: 'deck-2' }]

    expect(
      resolveQuickCreateDeckId(
        { sidebarType: 'deck', sidebarValue: 'deck-2' },
        cardA,
        decks,
      ),
    ).toBe('deck-2')

    expect(
      resolveQuickCreateDeckId(
        { sidebarType: 'all', sidebarValue: null },
        cardB,
        decks,
      ),
    ).toBe('deck-2')

    expect(
      resolveQuickCreateDeckId(
        { sidebarType: 'all', sidebarValue: null },
        null,
        decks,
      ),
    ).toBe('deck-1')

    expect(
      resolveQuickCreateDeckId(
        { sidebarType: 'all', sidebarValue: null },
        null,
        [],
      ),
    ).toBeNull()
  })

  it('buildEditorSnapshot maps card fields', () => {
    expect(buildEditorSnapshot(cardA)).toEqual({
      frontText: 'Apple',
      backText: 'Apple',
      imagemUrl: undefined,
      cardTags: '',
      ttsEnabled: false,
    })
  })

  it('buildTtsSavePayload maps enabled flag to CardUpdateInput', () => {
    expect(buildTtsSavePayload(true)).toEqual({ ttsEnabled: true })
    expect(buildTtsSavePayload(false)).toEqual({ ttsEnabled: false })
  })

  it('buildTextSavePayload maps editor text to CardUpdateInput', () => {
    expect(buildTextSavePayload('Hello', 'Hi')).toEqual({
      front: 'Hello',
      back: 'Hi',
    })
  })

  it('buildImageSavePayload includes image url', () => {
    const editor = buildEditorSnapshot(cardA)
    expect(buildImageSavePayload(cardA, editor, '/img.png')).toEqual({
      front: 'Apple',
      back: 'Apple',
      imagemUrl: '/img.png',
    })
  })

  it('shouldRefetchOnFilterChange detects sidebar changes only', () => {
    expect(
      shouldRefetchOnFilterChange(
        { sidebarType: 'all', sidebarValue: null },
        { sidebarType: 'deck', sidebarValue: 'deck-1' },
      ),
    ).toBe(true)

    expect(
      shouldRefetchOnFilterChange(
        { sidebarType: 'deck', sidebarValue: 'deck-1' },
        { sidebarType: 'deck', sidebarValue: 'deck-1' },
      ),
    ).toBe(false)
  })

  it('toggleSortColumn toggles direction or resets column', () => {
    expect(toggleSortColumn('front', 'asc', 'front')).toEqual({
      sortColumn: 'front',
      sortDirection: 'desc',
    })

    expect(toggleSortColumn('front', 'asc', 'deck')).toEqual({
      sortColumn: 'deck',
      sortDirection: 'asc',
    })
  })

  it('applyBrowseFilters combines search and sort', () => {
    const result = applyBrowseFilters(
      [cardB, cardA],
      {
        searchQuery: 'app',
        sortColumn: 'front',
        sortDirection: 'asc',
      },
      () => 'Deck',
    )

    expect(result.map((c) => c.id)).toEqual(['a'])
  })

  it('hasActiveBrowseFilters detects sidebar and search filters', () => {
    expect(
      hasActiveBrowseFilters({ sidebarType: 'all', searchQuery: '' }),
    ).toBe(false)
    expect(
      hasActiveBrowseFilters({ sidebarType: 'deck', searchQuery: '' }),
    ).toBe(true)
    expect(
      hasActiveBrowseFilters({ sidebarType: 'all', searchQuery: 'test' }),
    ).toBe(true)
  })
})
