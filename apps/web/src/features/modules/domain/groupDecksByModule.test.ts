import { describe, expect, it } from 'vitest'
import type { Deck } from '@/features/decks/types/deck'
import type { Module } from '@/features/modules/types/module'
import { groupDecksByModule } from './groupDecksByModule'

const modules: Module[] = [
  {
    id: 'mod-1',
    name: 'Module 1',
    sortOrder: 1,
    promptModuleTypeId: 'visual-vocabulary',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mod-2',
    name: 'Module 2',
    sortOrder: 0,
    promptModuleTypeId: 'idiom',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const decks: Deck[] = [
  {
    id: 'deck-1',
    name: 'Alpha',
    moduleId: 'mod-1',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    newCardsDailyLimit: 10,
  },
  {
    id: 'deck-2',
    name: 'Beta',
    moduleId: 'mod-2',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    newCardsDailyLimit: 10,
  },
  {
    id: 'deck-3',
    name: 'Gamma',
    moduleId: null,
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    newCardsDailyLimit: 10,
  },
]

describe('groupDecksByModule', () => {
  it('orders modules by sortOrder and groups decks', () => {
    const sections = groupDecksByModule(modules, decks)

    expect(sections.map((section) => section.id)).toEqual([
      'mod-2',
      'mod-1',
      null,
    ])
    expect(sections[0]?.decks.map((deck) => deck.id)).toEqual(['deck-2'])
    expect(sections[1]?.decks.map((deck) => deck.id)).toEqual(['deck-1'])
    expect(sections[2]?.title).toBe('No Module')
    expect(sections[2]?.decks.map((deck) => deck.id)).toEqual(['deck-3'])
  })

  it('filters decks by search query before grouping', () => {
    const sections = groupDecksByModule(modules, decks, 'alpha')

    expect(sections).toHaveLength(1)
    expect(sections[0]?.id).toBe('mod-1')
    expect(sections[0]?.decks).toHaveLength(1)
    expect(sections[0]?.decks[0]?.name).toBe('Alpha')
  })
})
