import { useCallback, useMemo, useState } from 'react'

const STORAGE_KEY = 'openflaskcards.dashboard.pinned-decks'

function readStoredPinnedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export interface UsePinnedDecksResult {
  pinnedDeckIds: Set<string>
  isPinned: (deckId: string) => boolean
  togglePin: (deckId: string) => void
}

export function usePinnedDecks(): UsePinnedDecksResult {
  const [pinnedIds, setPinnedIds] = useState<string[]>(readStoredPinnedIds)

  const togglePin = useCallback((deckId: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(deckId)
        ? prev.filter((id) => id !== deckId)
        : [...prev, deckId]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore quota / private mode
      }
      return next
    })
  }, [])

  const pinnedDeckIds = useMemo(() => new Set(pinnedIds), [pinnedIds])

  const isPinned = useCallback(
    (deckId: string) => pinnedDeckIds.has(deckId),
    [pinnedDeckIds],
  )

  return { pinnedDeckIds, isPinned, togglePin }
}
