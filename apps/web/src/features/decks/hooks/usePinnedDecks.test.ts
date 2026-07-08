import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { usePinnedDecks } from './usePinnedDecks'

const STORAGE_KEY = 'openflaskcards.dashboard.pinned-decks'

describe('usePinnedDecks', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to no pinned decks when nothing is stored', () => {
    const { result } = renderHook(() => usePinnedDecks())
    expect(result.current.pinnedDeckIds.size).toBe(0)
    expect(result.current.isPinned('deck-1')).toBe(false)
  })

  it('reads previously pinned deck ids from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['deck-1', 'deck-2']))
    const { result } = renderHook(() => usePinnedDecks())
    expect(result.current.isPinned('deck-1')).toBe(true)
    expect(result.current.isPinned('deck-2')).toBe(true)
    expect(result.current.isPinned('deck-3')).toBe(false)
  })

  it('ignores malformed localStorage content', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json')
    const { result } = renderHook(() => usePinnedDecks())
    expect(result.current.pinnedDeckIds.size).toBe(0)
  })

  it('pins a deck and persists it', () => {
    const { result } = renderHook(() => usePinnedDecks())

    act(() => {
      result.current.togglePin('deck-1')
    })

    expect(result.current.isPinned('deck-1')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      'deck-1',
    ])
  })

  it('unpins an already-pinned deck', () => {
    const { result } = renderHook(() => usePinnedDecks())

    act(() => {
      result.current.togglePin('deck-1')
    })
    act(() => {
      result.current.togglePin('deck-1')
    })

    expect(result.current.isPinned('deck-1')).toBe(false)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([])
  })

  it('tracks multiple pinned decks independently', () => {
    const { result } = renderHook(() => usePinnedDecks())

    act(() => {
      result.current.togglePin('deck-1')
    })
    act(() => {
      result.current.togglePin('deck-2')
    })
    act(() => {
      result.current.togglePin('deck-1')
    })

    expect(result.current.isPinned('deck-1')).toBe(false)
    expect(result.current.isPinned('deck-2')).toBe(true)
  })
})
