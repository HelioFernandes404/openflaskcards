import type { Card, CardUpdateInput } from '@/features/cards/types/card'
import type {
  BrowseFilters,
  EditorSnapshot,
  SortColumn,
  SortDirection,
} from '@/features/cards/types/browse'

export function filterCardsBySearch(cards: Card[], query: string): Card[] {
  const trimmed = query.trim()
  if (!trimmed) return [...cards]

  const normalized = trimmed.toLowerCase()
  return cards.filter(
    (card) =>
      card.front.toLowerCase().includes(normalized) ||
      card.back.toLowerCase().includes(normalized),
  )
}

export function sortCards(
  cards: Card[],
  column: SortColumn,
  direction: SortDirection,
  deckNameResolver: (deckId: string) => string,
): Card[] {
  const sorted = [...cards]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (column) {
      case 'front':
        comparison = a.front.localeCompare(b.front)
        break
      case 'state':
        comparison = a.state.localeCompare(b.state)
        break
      case 'deck':
        comparison = deckNameResolver(a.deckId).localeCompare(
          deckNameResolver(b.deckId),
        )
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

export function applyBrowseFilters(
  cards: Card[],
  filters: Pick<BrowseFilters, 'searchQuery' | 'sortColumn' | 'sortDirection'>,
  deckNameResolver: (deckId: string) => string,
): Card[] {
  const searched = filterCardsBySearch(cards, filters.searchQuery)
  return sortCards(
    searched,
    filters.sortColumn,
    filters.sortDirection,
    deckNameResolver,
  )
}

export function resolveSelection(
  cards: Card[],
  currentId: string | null,
): string | null {
  if (cards.length === 0) return null
  if (currentId && cards.some((card) => card.id === currentId)) return currentId
  return cards[0]?.id ?? null
}

export function buildEditorSnapshot(card: Card | null): EditorSnapshot {
  if (!card) {
    return {
      frontText: '',
      backText: '',
      imagemUrl: undefined,
      cardTags: '',
      ttsEnabled: true,
    }
  }

  return {
    frontText: card.front,
    backText: card.back,
    imagemUrl: card.imagemUrl,
    cardTags: '',
    ttsEnabled: card.ttsEnabled,
  }
}

export function buildTtsSavePayload(enabled: boolean): CardUpdateInput {
  return { ttsEnabled: enabled }
}

export function buildTextSavePayload(
  frontText: string,
  backText: string,
): CardUpdateInput {
  return {
    front: frontText,
    back: backText,
  }
}

export function buildImageSavePayload(
  card: Card,
  editor: EditorSnapshot,
  imagemUrl: string | undefined,
): CardUpdateInput {
  return {
    front: editor.frontText || card.front,
    back: editor.backText || card.back,
    imagemUrl: imagemUrl ?? '',
  }
}

export function shouldRefetchOnFilterChange(
  prev: Pick<BrowseFilters, 'sidebarType' | 'sidebarValue'>,
  next: Pick<BrowseFilters, 'sidebarType' | 'sidebarValue'>,
): boolean {
  return (
    prev.sidebarType !== next.sidebarType ||
    prev.sidebarValue !== next.sidebarValue
  )
}

export function toggleSortColumn(
  currentColumn: SortColumn,
  currentDirection: SortDirection,
  column: SortColumn,
): Pick<BrowseFilters, 'sortColumn' | 'sortDirection'> {
  if (currentColumn === column) {
    return {
      sortColumn: column,
      sortDirection: currentDirection === 'asc' ? 'desc' : 'asc',
    }
  }

  return {
    sortColumn: column,
    sortDirection: 'asc',
  }
}

export function hasActiveBrowseFilters(
  filters: Pick<BrowseFilters, 'sidebarType' | 'searchQuery'>,
): boolean {
  return filters.sidebarType !== 'all' || filters.searchQuery.trim().length > 0
}

export const QUICK_CREATE_PLACEHOLDER = {
  front: '…',
  back: '…',
} as const

export function resolveQuickCreateDeckId(
  filters: Pick<BrowseFilters, 'sidebarType' | 'sidebarValue'>,
  selectedCard: Card | null,
  decks: Array<{ id: string }>,
): string | null {
  if (filters.sidebarType === 'deck' && filters.sidebarValue) {
    return filters.sidebarValue
  }

  if (selectedCard?.deckId) {
    return selectedCard.deckId
  }

  return decks[0]?.id ?? null
}
