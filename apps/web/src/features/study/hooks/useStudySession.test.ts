import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardBack, CardFront } from '@/features/cards/types/card'
import type { Deck } from '@/features/decks/types/deck'
import {
  resolveStudySessionKeyAction,
  shouldIgnoreStudySessionHotkey,
} from './useStudySession'
import { createStorageStub } from '../../../../tests/support/createStorageStub'
import { getLastSessionSnapshot } from '../services/studySessionPreferences'

describe('resolveStudySessionKeyAction', () => {
  it('maps Space to flip when the card front is showing', () => {
    expect(resolveStudySessionKeyAction(' ', 'Space', false)).toBe('flip')
  })

  it('maps digit keys to ratings when the card back is showing', () => {
    expect(resolveStudySessionKeyAction('1', 'Digit1', true)).toBe(1)
    expect(resolveStudySessionKeyAction('2', 'Digit2', true)).toBe(2)
    expect(resolveStudySessionKeyAction('3', 'Digit3', true)).toBe(3)
    expect(resolveStudySessionKeyAction('4', 'Digit4', true)).toBe(4)
  })

  it('maps QWER keys to ratings when the card back is showing', () => {
    expect(resolveStudySessionKeyAction('q', 'KeyQ', true)).toBe(1)
    expect(resolveStudySessionKeyAction('w', 'KeyW', true)).toBe(2)
    expect(resolveStudySessionKeyAction('e', 'KeyE', true)).toBe(3)
    expect(resolveStudySessionKeyAction('r', 'KeyR', true)).toBe(4)
  })

  it('ignores Space when flipped and rating keys when not flipped', () => {
    expect(resolveStudySessionKeyAction(' ', 'Space', true)).toBeNull()
    expect(resolveStudySessionKeyAction('1', 'Digit1', false)).toBeNull()
    expect(resolveStudySessionKeyAction('e', 'KeyE', false)).toBeNull()
  })
})

describe('shouldIgnoreStudySessionHotkey', () => {
  it('ignores hotkeys when typing in form fields', () => {
    expect(
      shouldIgnoreStudySessionHotkey(document.createElement('input')),
    ).toBe(true)
    expect(
      shouldIgnoreStudySessionHotkey(document.createElement('textarea')),
    ).toBe(true)
    expect(shouldIgnoreStudySessionHotkey(document.createElement('div'))).toBe(
      false,
    )
  })
})

const navigateMock = vi.fn()
const showToastMock = vi.fn()
const getDueCardsSummaryMock = vi.fn()
const getCardBackMock = vi.fn()
const getReviewPreviewMock = vi.fn()
const handleSubmitReviewMock = vi.fn()
const handleUpdateCardMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/shared/providers/NotificationProvider', () => ({
  useNotification: () => ({ showToast: showToastMock }),
}))

vi.mock('@/features/study/providers/StudyDataProvider', () => ({
  useStudyData: () => ({
    decks: mockDecks,
    getDueCardsSummary: getDueCardsSummaryMock,
    getCardBack: getCardBackMock,
    handleSubmitReview: handleSubmitReviewMock,
    handleUpdateCard: handleUpdateCardMock,
    getReviewPreview: getReviewPreviewMock,
    studyService: { getCard: vi.fn() },
    loading: { updateCard: false },
  }),
}))

vi.mock('@/features/study/utils/studySessionSounds', () => ({
  playStudySessionSound: vi.fn(),
}))

const mockDecks: Deck[] = [
  {
    id: 'deck-1',
    name: 'Test Deck',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    newCardsDailyLimit: 10,
  },
  {
    id: 'deck-2',
    name: 'Other Deck',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    newCardsDailyLimit: 10,
  },
]

function makeCardFront(overrides: Partial<CardFront>): CardFront {
  return {
    id: 'card-1',
    deckId: 'deck-1',
    front: 'front text',
    ttsEnabled: false,
    state: 'new',
    reps: 0,
    ...overrides,
  }
}

function makeCardBack(cardId: string): CardBack {
  return {
    id: cardId,
    deckId: 'deck-1',
    front: 'front text',
    back: 'back text',
    stability: 1,
    difficulty: 5,
    due: '2024-01-01T00:00:00Z',
    state: 'new',
    reps: 0,
    lapses: 0,
  }
}

describe('useStudySession behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageStub())
    getDueCardsSummaryMock.mockResolvedValue({
      cards: [
        makeCardFront({ id: 'card-1', state: 'new' }),
        makeCardFront({ id: 'card-2', state: 'review' }),
      ],
      totalDue: 2,
      newCardsDailyLimit: 10,
      newCardsStudiedToday: 0,
      remainingNewCardsToday: 10,
      isNewCardsLimitReached: false,
    })
    getCardBackMock.mockImplementation((cardId: string) =>
      Promise.resolve(makeCardBack(cardId)),
    )
    getReviewPreviewMock.mockResolvedValue({
      cardId: 'card-1',
      currentRetrievability: 0.9,
      options: [],
    })
    handleSubmitReviewMock.mockResolvedValue({
      cardId: 'card-1',
      state: 'review',
      stability: 2,
      difficulty: 5,
      due: '2024-02-01T00:00:00Z',
      reps: 1,
      lapses: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function renderActiveSession() {
    const { useStudySession } = await import('./useStudySession')
    const { result } = renderHook(() => useStudySession('deck-1'))
    await waitFor(() => expect(result.current.phase).toBe('active'))
    return result
  }

  it('loads the due cards and starts in the active phase', async () => {
    const result = await renderActiveSession()

    expect(result.current.cardFronts).toHaveLength(2)
    expect(result.current.currentCardIndex).toBe(0)
    expect(result.current.currentFront?.id).toBe('card-1')
    expect(result.current.quotaInfo?.newCardsStudiedToday).toBe(0)
  })

  it('flip loads the card back and preview, flipping the card', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })

    expect(getCardBackMock).toHaveBeenCalledWith('card-1')
    expect(getReviewPreviewMock).toHaveBeenCalledWith('card-1')
    expect(result.current.isFlipped).toBe(true)
    expect(result.current.currentBack?.id).toBe('card-1')
  })

  it('rate submits the review, decrements the new-card quota, and advances to the next card', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })

    expect(handleSubmitReviewMock).toHaveBeenCalledWith(
      'card-1',
      3,
      expect.any(Number),
    )
    expect(result.current.currentCardIndex).toBe(1)
    expect(result.current.currentFront?.id).toBe('card-2')
    expect(result.current.isFlipped).toBe(false)
    expect(result.current.quotaInfo?.newCardsStudiedToday).toBe(1)
    expect(result.current.quotaInfo?.remainingNewCardsToday).toBe(9)
  })

  it('does not touch the new-card quota when rating a non-new card', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })
    expect(result.current.quotaInfo?.newCardsStudiedToday).toBe(1)

    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })

    expect(result.current.quotaInfo?.newCardsStudiedToday).toBe(1)
  })

  it('reaches the finished phase after rating every due card', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })
    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })

    expect(result.current.phase).toBe('finished')
  })

  it('does not submit a review before the card is flipped', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.rate(3)
    })

    expect(handleSubmitReviewMock).not.toHaveBeenCalled()
    expect(result.current.currentCardIndex).toBe(0)
    expect(result.current.isFlipped).toBe(false)
    expect(result.current.combo).toBe(0)
  })

  it('keeps the current card and session stats when review submission fails', async () => {
    handleSubmitReviewMock.mockRejectedValueOnce(new Error('network error'))
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })

    expect(handleSubmitReviewMock).toHaveBeenCalledWith(
      'card-1',
      3,
      expect.any(Number),
    )
    expect(result.current.currentCardIndex).toBe(0)
    expect(result.current.currentFront?.id).toBe('card-1')
    expect(result.current.isFlipped).toBe(true)
    expect(result.current.combo).toBe(0)
    expect(showToastMock).toHaveBeenCalled()
  })

  it('builds session summary and persists a deck snapshot when the session finishes', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(4)
    })
    await act(async () => {
      await result.current.flip()
    })
    await act(async () => {
      await result.current.rate(3)
    })

    await waitFor(() => expect(result.current.phase).toBe('finished'))

    expect(result.current.sessionSummary).toMatchObject({
      totalCards: 2,
      againCount: 0,
      hardCount: 0,
      goodCount: 1,
      easyCount: 1,
      successRate: 100,
      maxCombo: 2,
      clearedQueue: true,
    })

    const snapshot = getLastSessionSnapshot('deck-1')
    expect(snapshot).toMatchObject({
      deckId: 'deck-1',
      totalCards: 2,
      successRate: 100,
      maxCombo: 2,
    })
    expect(snapshot?.finishedAt).toEqual(expect.any(String))
  })

  it('flips the card when Space is pressed on the front', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: ' ',
          code: 'Space',
          bubbles: true,
        }),
      )
    })

    await waitFor(() => expect(result.current.isFlipped).toBe(true))
    expect(getCardBackMock).toHaveBeenCalledWith('card-1')
  })

  it('submits a rating when a digit key is pressed on the back', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '3',
          code: 'Digit3',
          bubbles: true,
        }),
      )
    })

    await waitFor(() =>
      expect(handleSubmitReviewMock).toHaveBeenCalledWith(
        'card-1',
        3,
        expect.any(Number),
      ),
    )
  })

  it('submits a rating when a QWER key is pressed on the back', async () => {
    const result = await renderActiveSession()

    await act(async () => {
      await result.current.flip()
    })

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'r',
          code: 'KeyR',
          bubbles: true,
        }),
      )
    })

    await waitFor(() =>
      expect(handleSubmitReviewMock).toHaveBeenCalledWith(
        'card-1',
        4,
        expect.any(Number),
      ),
    )
  })

  it('ignores a stale due-cards response after the deck changes mid-fetch', async () => {
    const { useStudySession } = await import('./useStudySession')

    let resolveDeck1: (value: unknown) => void = () => {}
    const deck1Promise = new Promise((resolve) => {
      resolveDeck1 = resolve
    })

    getDueCardsSummaryMock.mockImplementation((deckId: string) => {
      if (deckId === 'deck-1') return deck1Promise
      return Promise.resolve({
        cards: [makeCardFront({ id: 'deck-2-card', deckId: 'deck-2' })],
        totalDue: 1,
        newCardsDailyLimit: 10,
        newCardsStudiedToday: 0,
        remainingNewCardsToday: 10,
        isNewCardsLimitReached: false,
      })
    })

    const { result, rerender } = renderHook(
      ({ deckId }) => useStudySession(deckId),
      { initialProps: { deckId: 'deck-1' } },
    )

    // Navigate away to deck-2 before the deck-1 request resolves.
    rerender({ deckId: 'deck-2' })

    await waitFor(() =>
      expect(result.current.currentFront?.id).toBe('deck-2-card'),
    )

    // The stale deck-1 response arrives late; it must not overwrite
    // the deck-2 cards already loaded into state.
    await act(async () => {
      resolveDeck1({
        cards: [makeCardFront({ id: 'card-1' }), makeCardFront({ id: 'card-2' })],
        totalDue: 2,
        newCardsDailyLimit: 10,
        newCardsStudiedToday: 0,
        remainingNewCardsToday: 10,
        isNewCardsLimitReached: false,
      })
      await Promise.resolve()
    })

    expect(result.current.cardFronts).toHaveLength(1)
    expect(result.current.currentFront?.id).toBe('deck-2-card')
  })
})
