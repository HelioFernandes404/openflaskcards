import type { Deck } from '@/features/decks/types/deck'

export function sortDecksPinnedFirst(
  decks: Deck[],
  pinnedDeckIds: Set<string>,
): Deck[] {
  return [...decks].sort((a, b) => {
    const aPinned = pinnedDeckIds.has(a.id)
    const bPinned = pinnedDeckIds.has(b.id)
    if (aPinned === bPinned) return 0
    return aPinned ? -1 : 1
  })
}
