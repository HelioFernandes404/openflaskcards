import type { Deck } from '@/features/decks/types/deck'
import type { Module } from '@/features/modules/types/module'

export interface DeckModuleSection {
  id: string | null
  title: string
  sortOrder: number
  decks: Deck[]
}

function matchesSearch(deck: Deck, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return true
  return (
    deck.name.toLowerCase().includes(query) ||
    (deck.description?.toLowerCase().includes(query) ?? false)
  )
}

export function groupDecksByModule(
  modules: Module[],
  decks: Deck[],
  searchQuery = '',
): DeckModuleSection[] {
  const filteredDecks = decks.filter((deck) => matchesSearch(deck, searchQuery))
  const sortedModules = [...modules].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.name.localeCompare(b.name)
  })

  const hasSearch = searchQuery.trim().length > 0

  const sections: DeckModuleSection[] = sortedModules.map((module) => ({
    id: module.id,
    title: module.name,
    sortOrder: module.sortOrder,
    decks: filteredDecks.filter((deck) => deck.moduleId === module.id),
  }))

  const unassigned = filteredDecks.filter((deck) => !deck.moduleId)
  if (unassigned.length > 0 || (!hasSearch && sections.length === 0)) {
    sections.push({
      id: null,
      title: 'No Module',
      sortOrder: Number.MAX_SAFE_INTEGER,
      decks: unassigned,
    })
  }

  if (hasSearch) {
    return sections.filter((section) => section.decks.length > 0)
  }

  return sections.filter(
    (section) => section.decks.length > 0 || section.id !== null,
  )
}
