import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Deck } from '@/features/decks/types/deck'
import type { Card } from '@/features/cards/types/card'
import type { IStudyService } from '@/services'
import type { StudyDataContextValue } from './StudyDataProvider'

vi.mock('@/features/study/services/ApiStudyService', () => ({
  ApiStudyService: vi.fn(),
}))

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('@/shared/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

const mockDeck: Deck = {
  id: 'deck-1',
  name: 'Test Deck',
  userId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  newCardsDailyLimit: 10,
}

function createMockService(
  overrides: Partial<IStudyService> = {},
): IStudyService {
  return {
    getDecks: vi.fn().mockResolvedValue([mockDeck]),
    getDeckStats: vi.fn().mockResolvedValue([
      {
        deckId: 'deck-1',
        newCount: 2,
        learningCount: 1,
        reviewCount: 3,
        totalCards: 6,
        newCardsStudiedToday: 0,
        newCardsDailyLimit: 10,
      },
    ]),
    getDeck: vi.fn(),
    createDeck: vi.fn(),
    updateDeck: vi.fn(),
    deleteDeck: vi.fn(),
    getModules: vi.fn().mockResolvedValue([]),
    createModule: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
    getNotes: vi.fn().mockResolvedValue([]),
    getNote: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    getPromptTemplates: vi.fn().mockResolvedValue([]),
    getPromptTemplate: vi.fn(),
    createPromptTemplate: vi.fn(),
    updatePromptTemplate: vi.fn(),
    deletePromptTemplate: vi.fn(),
    getLetters: vi.fn().mockResolvedValue([]),
    getLetter: vi.fn(),
    createLetter: vi.fn(),
    updateLetter: vi.fn(),
    deleteLetter: vi.fn(),
    getKanbanCards: vi.fn().mockResolvedValue([]),
    getKanbanCard: vi.fn(),
    createKanbanCard: vi.fn(),
    updateKanbanCard: vi.fn(),
    deleteKanbanCard: vi.fn(),
    pullNextKanbanCard: vi.fn(),
    getCards: vi.fn().mockResolvedValue([]),
    getCard: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    uploadImage: vi.fn(),
    getCardFront: vi.fn(),
    getCardBack: vi.fn(),
    getCardAudio: vi.fn(),
    getDueCardsSummary: vi.fn(),
    submitReview: vi.fn(),
    getReviewPreview: vi.fn(),
    getBrowseFilters: vi
      .fn()
      .mockResolvedValue({ totalCards: 0, sections: [] }),
    getBrowseCards: vi.fn().mockResolvedValue([]),
    bulkCreateCards: vi.fn(),
    exportDeckCards: vi.fn(),
    getCurrentUser: vi.fn(),
    updateUser: vi.fn(),
    updateFSRSSettings: vi.fn(),
    optimizeFSRS: vi.fn().mockResolvedValue({ status: 'running' }),
    ...overrides,
  }
}

describe('StudyDataProvider', () => {
  it('loads decks after mount', async () => {
    const service = createMockService()
    const { StudyDataProvider, useStudyData } = await import(
      './StudyDataProvider'
    )
    const { NotificationProvider } = await import(
      '@/shared/providers/NotificationProvider'
    )

    function DeckCount() {
      const { decks } = useStudyData()
      return <div data-testid="deck-count">{decks.length}</div>
    }

    render(
      <NotificationProvider>
        <StudyDataProvider service={service}>
          <DeckCount />
        </StudyDataProvider>
      </NotificationProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-count')).toHaveTextContent('1')
    })

    expect(service.getDecks).toHaveBeenCalledTimes(1)
    expect(service.getDeckStats).toHaveBeenCalledTimes(1)
    expect(service.getModules).toHaveBeenCalledTimes(1)
    expect(service.getCards).not.toHaveBeenCalled()
  })

  it('shares deck state across consumers', async () => {
    const service = createMockService()
    const { StudyDataProvider, useStudyData } = await import(
      './StudyDataProvider'
    )
    const { NotificationProvider } = await import(
      '@/shared/providers/NotificationProvider'
    )

    function DeckCount({ testId }: { testId: string }) {
      const { decks } = useStudyData()
      return <div data-testid={testId}>{decks.length}</div>
    }

    render(
      <NotificationProvider>
        <StudyDataProvider service={service}>
          <DeckCount testId="consumer-a" />
          <DeckCount testId="consumer-b" />
        </StudyDataProvider>
      </NotificationProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('consumer-a')).toHaveTextContent('1')
      expect(screen.getByTestId('consumer-b')).toHaveTextContent('1')
    })
  })

  it('merges the review result into the cached card instead of replacing it', async () => {
    const existingCard: Card = {
      id: 'card-1',
      deckId: 'deck-1',
      front: 'front text',
      back: 'back text',
      stability: 1,
      difficulty: 5,
      due: '2024-01-01T00:00:00Z',
      state: 'new',
      reps: 0,
      lapses: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ttsEnabled: false,
    }
    const service = createMockService({
      getCards: vi.fn().mockResolvedValue([existingCard]),
      // Mirrors the API's reviewResp shape: no id/deckId/front/back.
      submitReview: vi.fn().mockResolvedValue({
        cardId: 'card-1',
        state: 'review',
        stability: 3.2,
        difficulty: 4.5,
        due: '2024-02-01T00:00:00Z',
        lastReview: '2024-01-15T00:00:00Z',
        reps: 1,
        lapses: 0,
      }),
    })
    const { StudyDataProvider, useStudyData } = await import(
      './StudyDataProvider'
    )
    const { NotificationProvider } = await import(
      '@/shared/providers/NotificationProvider'
    )

    let ctx: StudyDataContextValue | undefined
    function Consumer() {
      ctx = useStudyData()
      return null
    }

    render(
      <NotificationProvider>
        <StudyDataProvider service={service}>
          <Consumer />
        </StudyDataProvider>
      </NotificationProvider>,
    )

    await waitFor(() => expect(ctx).toBeDefined())
    await act(async () => {
      await ctx!.loadDeckCards('deck-1')
    })
    await act(async () => {
      await ctx!.handleSubmitReview('card-1', 3, 1000)
    })

    const updated = ctx!.getDeckCards('deck-1')[0]
    expect(updated.front).toBe('front text')
    expect(updated.back).toBe('back text')
    expect(updated.deckId).toBe('deck-1')
    expect(updated.state).toBe('review')
    expect(updated.stability).toBe(3.2)
    expect(updated.reps).toBe(1)
    expect(ctx!.cardsByDeck['undefined']).toBeUndefined()
  })

  it('patches the deck aggregate counters after a review instead of leaving them frozen', async () => {
    const existingCard: Card = {
      id: 'card-1',
      deckId: 'deck-1',
      front: 'front text',
      back: 'back text',
      stability: 1,
      difficulty: 5,
      due: '2024-01-01T00:00:00Z',
      state: 'new',
      reps: 0,
      lapses: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ttsEnabled: false,
    }
    const service = createMockService({
      getCards: vi.fn().mockResolvedValue([existingCard]),
      submitReview: vi.fn().mockResolvedValue({
        cardId: 'card-1',
        state: 'review',
        stability: 3.2,
        difficulty: 4.5,
        due: '2024-02-01T00:00:00Z',
        lastReview: '2024-01-15T00:00:00Z',
        reps: 1,
        lapses: 0,
      }),
    })
    const { StudyDataProvider, useStudyData } = await import(
      './StudyDataProvider'
    )
    const { NotificationProvider } = await import(
      '@/shared/providers/NotificationProvider'
    )

    let ctx: StudyDataContextValue | undefined
    function Consumer() {
      ctx = useStudyData()
      return null
    }

    render(
      <NotificationProvider>
        <StudyDataProvider service={service}>
          <Consumer />
        </StudyDataProvider>
      </NotificationProvider>,
    )

    await waitFor(() => expect(ctx).toBeDefined())
    // getDeckStats mock returns newCount: 2, reviewCount: 3, newCardsStudiedToday: 0.
    await waitFor(() => {
      const deck = ctx!.decks.find((d) => d.id === 'deck-1')
      expect(deck?.newCount).toBe(2)
    })
    await act(async () => {
      await ctx!.loadDeckCards('deck-1')
    })
    await act(async () => {
      await ctx!.handleSubmitReview('card-1', 3, 1000)
    })

    const deck = ctx!.decks.find((d) => d.id === 'deck-1')
    expect(deck?.newCount).toBe(1)
    expect(deck?.newCardsStudiedToday).toBe(1)
  })
})
