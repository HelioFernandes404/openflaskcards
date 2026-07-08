import { describe, expect, it } from 'vitest'
import { FakeStudyService } from './FakeStudyService'

describe('FakeStudyService', () => {
  it('implements browse and import methods', async () => {
    const service = new FakeStudyService({
      decks: [
        {
          id: 'deck-1',
          name: 'English Basics',
          userId: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          newCardsDailyLimit: 10,
        },
      ],
      cards: [
        {
          id: 'card-1',
          deckId: 'deck-1',
          front: 'Hello',
          back: 'Hi',
          stability: 0,
          difficulty: 0,
          due: '2024-01-01T00:00:00Z',
          state: 'new',
          reps: 0,
          lapses: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          ttsEnabled: false,
        },
      ],
      browseFilters: {
        totalCards: 1,
        sections: [],
      },
    })

    const filters = await service.getBrowseFilters()
    expect(filters.totalCards).toBe(1)

    const cards = await service.getBrowseCards({
      filterType: 'deck',
      filterValue: 'deck-1',
    })
    expect(cards).toHaveLength(1)

    const result = await service.bulkCreateCards({
      deckId: 'deck-1',
      cards: [{ front: 'Bye', back: 'Goodbye' }],
    })
    expect(result.created).toBe(1)
    expect(await service.getCards('deck-1')).toHaveLength(2)
  })
})
