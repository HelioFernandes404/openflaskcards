import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Deck,
  DeckCreateInput,
  DeckUpdateInput,
} from '@/features/decks/types/deck'
import type {
  Module,
  ModuleCreateInput,
  ModuleUpdateInput,
} from '@/features/modules/types/module'
import type {
  Card,
  CardFront,
  CardBack,
  CardCreateInput,
  CardUpdateInput,
  DueCardsSummary,
  ReviewResult,
} from '@/features/cards/types/card'
import type { ReviewPreviewResponse } from '@/features/study/types/preview'
import type { IStudyService } from '@/services'
import { ApiStudyService } from '@/features/study/services/ApiStudyService'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { accessTokenStore } from '@/shared/services/accessTokenStore'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'

interface LoadingState {
  decks: boolean
  createDeck: boolean
  updateDeck: boolean
  deleteDeck: boolean
  createModule: boolean
  updateModule: boolean
  deleteModule: boolean
  addCard: boolean
  updateCard: boolean
  deleteCard: boolean
}

export interface StudyDataContextValue {
  decks: Deck[]
  modules: Module[]
  cardsByDeck: Record<string, Card[]>
  loading: LoadingState
  error: string | null
  totalCardCount: number
  refreshDecks: () => Promise<void>
  loadDeckCards: (deckId: string) => Promise<Card[]>
  getDeckCards: (deckId: string) => Card[]
  handleCreateDeck: (
    data: DeckCreateInput,
    onSuccess?: (deckId: string) => void,
  ) => Promise<void>
  handleUpdateDeck: (deckId: string, data: DeckUpdateInput) => Promise<void>
  handleDeleteDeck: (deckId: string) => Promise<void>
  handleCreateModule: (data: ModuleCreateInput) => Promise<Module | null>
  handleUpdateModule: (
    moduleId: string,
    data: ModuleUpdateInput,
  ) => Promise<void>
  handleDeleteModule: (moduleId: string) => Promise<void>
  handleAddCard: (cardData: CardCreateInput) => Promise<Card | null>
  handleUpdateCard: (cardId: string, data: CardUpdateInput) => Promise<Card>
  handleDeleteCard: (cardId: string) => Promise<void>
  handleSubmitReview: (
    cardId: string,
    rating: 1 | 2 | 3 | 4,
    durationMs?: number,
  ) => Promise<ReviewResult>
  getDueCardsSummary: (deckId: string) => Promise<DueCardsSummary | null>
  getCardFront: (cardId: string) => Promise<CardFront>
  getCardBack: (cardId: string) => Promise<CardBack>
  getReviewPreview: (cardId: string) => Promise<ReviewPreviewResponse>
  studyService: IStudyService
}

const StudyDataContext = createContext<StudyDataContextValue | undefined>(
  undefined,
)

const initialLoading: LoadingState = {
  decks: false,
  createDeck: false,
  updateDeck: false,
  deleteDeck: false,
  createModule: false,
  updateModule: false,
  deleteModule: false,
  addCard: false,
  updateCard: false,
  deleteCard: false,
}

interface StudyDataProviderProps {
  children: ReactNode
  service?: IStudyService
}

export function StudyDataProvider({
  children,
  service,
}: StudyDataProviderProps) {
  const { user } = useAuth()
  const { showToast } = useNotification()

  const studyService = useMemo(
    () => service ?? new ApiStudyService(),
    [service],
  )

  const [decks, setDecks] = useState<Deck[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [cardsByDeck, setCardsByDeck] = useState<Record<string, Card[]>>({})
  const [loading, setLoading] = useState<LoadingState>(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const setLoadingState = useCallback(
    (key: keyof LoadingState, value: boolean) => {
      setLoading((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const getErrorMessage = useCallback((err: unknown, fallbackKey: string) => {
    return getUserFacingErrorMessage(err, { fallbackKey })
  }, [])

  const mergeDeckStats = useCallback(
    (
      fetchedDecks: Deck[],
      stats: Awaited<ReturnType<IStudyService['getDeckStats']>>,
    ): Deck[] => {
      const statsMap = new Map(stats.map((s) => [s.deckId, s]))
      return fetchedDecks.map((deck) => {
        const deckStats = statsMap.get(deck.id)
        return {
          ...deck,
          newCount: deckStats?.newCount ?? 0,
          learnCount: deckStats?.learningCount ?? 0,
          reviewCount: deckStats?.reviewCount ?? 0,
          newCardsStudiedToday: deckStats?.newCardsStudiedToday ?? 0,
          newCardsDailyLimit: deckStats?.newCardsDailyLimit ?? 10,
          totalCards: deckStats?.totalCards ?? 0,
        }
      })
    },
    [],
  )

  const refreshDecks = useCallback(async () => {
    try {
      setLoadingState('decks', true)
      setError(null)

      const [fetchedDecks, stats, fetchedModules] = await Promise.all([
        studyService.getDecks(),
        studyService.getDeckStats(),
        studyService.getModules(),
      ])

      setDecks(mergeDeckStats(fetchedDecks, stats))
      setModules(fetchedModules)
    } catch (err) {
      const message = getErrorMessage(err, 'dashboard:errors.loadDecks')
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoadingState('decks', false)
    }
  }, [
    getErrorMessage,
    mergeDeckStats,
    setLoadingState,
    showToast,
    studyService,
  ])

  const loadDeckCards = useCallback(
    async (deckId: string): Promise<Card[]> => {
      const deckCards = await studyService.getCards(deckId)
      setCardsByDeck((prev) => ({ ...prev, [deckId]: deckCards }))
      return deckCards
    },
    [studyService],
  )

  const getDeckCards = useCallback(
    (deckId: string): Card[] => cardsByDeck[deckId] ?? [],
    [cardsByDeck],
  )

  useEffect(() => {
    if (!user || !accessTokenStore.get()) {
      setDecks([])
      setModules([])
      setCardsByDeck({})
      return
    }

    void refreshDecks()
    // Reload when auth identity changes, not when refreshDecks reference updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const totalCardCount = useMemo(
    () => decks.reduce((sum, deck) => sum + (deck.totalCards ?? 0), 0),
    [decks],
  )

  const updateDeckCache = useCallback(
    (deckId: string, updater: (cards: Card[]) => Card[]) => {
      setCardsByDeck((prev) => ({
        ...prev,
        [deckId]: updater(prev[deckId] ?? []),
      }))
    },
    [],
  )

  const handleCreateDeck = useCallback(
    async (data: DeckCreateInput, onSuccess?: (deckId: string) => void) => {
      try {
        setLoadingState('createDeck', true)
        setError(null)
        const newDeck = await studyService.createDeck(data)
        setDecks((prev) => [...prev, newDeck])
        showToast('Deck Created Successfully')
        onSuccess?.(newDeck.id)
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.createDeck')
        setError(message)
        showToast(message, 'error')
      } finally {
        setLoadingState('createDeck', false)
      }
    },
    [getErrorMessage, setLoadingState, showToast, studyService],
  )

  const handleUpdateDeck = useCallback(
    async (deckId: string, data: DeckUpdateInput) => {
      try {
        setLoadingState('updateDeck', true)
        setError(null)
        const updatedDeck = await studyService.updateDeck(deckId, data)
        setDecks((prev) =>
          prev.map((d) => (d.id === deckId ? { ...d, ...updatedDeck } : d)),
        )
        showToast('Deck Updated Successfully')
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.updateDeck')
        setError(message)
        showToast(message, 'error')
        throw err
      } finally {
        setLoadingState('updateDeck', false)
      }
    },
    [getErrorMessage, setLoadingState, showToast, studyService],
  )

  const handleDeleteDeck = useCallback(
    async (deckId: string) => {
      try {
        setLoadingState('deleteDeck', true)
        setError(null)
        await studyService.deleteDeck(deckId)
        setDecks((prev) => prev.filter((d) => d.id !== deckId))
        setCardsByDeck((prev) => {
          const next = { ...prev }
          delete next[deckId]
          return next
        })
        showToast('Deck Deleted Successfully')
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.deleteDeck')
        setError(message)
        showToast(message, 'error')
        throw err
      } finally {
        setLoadingState('deleteDeck', false)
      }
    },
    [getErrorMessage, setLoadingState, showToast, studyService],
  )

  const handleCreateModule = useCallback(
    async (data: ModuleCreateInput): Promise<Module | null> => {
      try {
        setLoadingState('createModule', true)
        setError(null)
        const created = await studyService.createModule(data)
        setModules((prev) =>
          [...prev, created].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
        )
        showToast('Module Created Successfully')
        return created
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.createModule')
        setError(message)
        showToast(message, 'error')
        return null
      } finally {
        setLoadingState('createModule', false)
      }
    },
    [getErrorMessage, setLoadingState, showToast, studyService],
  )

  const handleUpdateModule = useCallback(
    async (moduleId: string, data: ModuleUpdateInput) => {
      try {
        setLoadingState('updateModule', true)
        setError(null)
        const updated = await studyService.updateModule(moduleId, data)
        setModules((prev) =>
          prev
            .map((module) => (module.id === moduleId ? updated : module))
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
            ),
        )
        showToast('Module Updated Successfully')
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.updateModule')
        setError(message)
        showToast(message, 'error')
        throw err
      } finally {
        setLoadingState('updateModule', false)
      }
    },
    [getErrorMessage, setLoadingState, showToast, studyService],
  )

  const handleDeleteModule = useCallback(
    async (moduleId: string) => {
      try {
        setLoadingState('deleteModule', true)
        setError(null)
        await studyService.deleteModule(moduleId)
        setModules((prev) => prev.filter((module) => module.id !== moduleId))
        setDecks((prev) =>
          prev.map((deck) =>
            deck.moduleId === moduleId ? { ...deck, moduleId: null } : deck,
          ),
        )
        showToast('Module Deleted Successfully')
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.deleteModule')
        setError(message)
        showToast(message, 'error')
        throw err
      } finally {
        setLoadingState('deleteModule', false)
      }
    },
    [getErrorMessage, setLoadingState, showToast, studyService],
  )

  const handleAddCard = useCallback(
    async (cardData: CardCreateInput) => {
      try {
        setLoadingState('addCard', true)
        setError(null)
        const newCard = await studyService.createCard(cardData)
        updateDeckCache(cardData.deckId, (cards) => [...cards, newCard])
        setDecks((prevDecks) =>
          prevDecks.map((d) =>
            d.id === cardData.deckId
              ? {
                  ...d,
                  newCount: (d.newCount ?? 0) + 1,
                  totalCards: (d.totalCards ?? 0) + 1,
                }
              : d,
          ),
        )
        return newCard
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.addCard')
        setError(message)
        showToast(message, 'error')
        return null
      } finally {
        setLoadingState('addCard', false)
      }
    },
    [
      getErrorMessage,
      setLoadingState,
      showToast,
      studyService,
      updateDeckCache,
    ],
  )

  const handleUpdateCard = useCallback(
    async (cardId: string, data: CardUpdateInput) => {
      try {
        setLoadingState('updateCard', true)
        setError(null)
        const updatedCard = await studyService.updateCard(cardId, data)
        updateDeckCache(updatedCard.deckId, (cards) =>
          cards.map((c) => (c.id === cardId ? updatedCard : c)),
        )
        showToast('Card Updated Successfully')
        return updatedCard
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.updateCard')
        setError(message)
        showToast(message, 'error')
        throw err
      } finally {
        setLoadingState('updateCard', false)
      }
    },
    [
      getErrorMessage,
      setLoadingState,
      showToast,
      studyService,
      updateDeckCache,
    ],
  )

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      try {
        setLoadingState('deleteCard', true)
        setError(null)
        const cachedDeckId = Object.entries(cardsByDeck).find(([, cards]) =>
          cards.some((c) => c.id === cardId),
        )?.[0]
        await studyService.deleteCard(cardId)
        if (cachedDeckId) {
          updateDeckCache(cachedDeckId, (cards) =>
            cards.filter((c) => c.id !== cardId),
          )
          setDecks((prevDecks) =>
            prevDecks.map((d) =>
              d.id === cachedDeckId
                ? {
                    ...d,
                    newCount: Math.max(0, (d.newCount ?? 0) - 1),
                    totalCards: Math.max(0, (d.totalCards ?? 0) - 1),
                  }
                : d,
            ),
          )
        }
        showToast('Card Deleted Successfully')
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.deleteCard')
        setError(message)
        showToast(message, 'error')
        throw err
      } finally {
        setLoadingState('deleteCard', false)
      }
    },
    [
      cardsByDeck,
      getErrorMessage,
      setLoadingState,
      showToast,
      studyService,
      updateDeckCache,
    ],
  )

  const handleSubmitReview = useCallback(
    async (cardId: string, rating: 1 | 2 | 3 | 4, durationMs?: number) => {
      try {
        const result = await studyService.submitReview(
          cardId,
          rating,
          durationMs,
        )
        // The API only returns the updated FSRS fields, not the full card —
        // merge them into the cached card instead of replacing it, and find
        // the deck from the cache since the response has no deckId.
        const cachedDeckId = Object.entries(cardsByDeck).find(([, cards]) =>
          cards.some((c) => c.id === cardId),
        )?.[0]
        if (cachedDeckId) {
          const previousCard = cardsByDeck[cachedDeckId]?.find(
            (c) => c.id === cardId,
          )
          updateDeckCache(cachedDeckId, (cards) =>
            cards.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    state: result.state,
                    stability: result.stability,
                    difficulty: result.difficulty,
                    due: result.due,
                    lastReview: result.lastReview,
                    reps: result.reps,
                    lapses: result.lapses,
                  }
                : c,
            ),
          )
          // The card just left today's due queue — decrement whichever
          // bucket it was counted in before the review, mirroring the
          // local patch already done by handleAddCard/handleDeleteCard.
          setDecks((prevDecks) =>
            prevDecks.map((d) => {
              if (d.id !== cachedDeckId) return d
              if (previousCard?.state === 'new') {
                return {
                  ...d,
                  newCount: Math.max(0, (d.newCount ?? 0) - 1),
                  newCardsStudiedToday: (d.newCardsStudiedToday ?? 0) + 1,
                }
              }
              if (previousCard?.state === 'learning') {
                return {
                  ...d,
                  learnCount: Math.max(0, (d.learnCount ?? 0) - 1),
                }
              }
              if (
                previousCard?.state === 'review' ||
                previousCard?.state === 'relearning'
              ) {
                return {
                  ...d,
                  reviewCount: Math.max(0, (d.reviewCount ?? 0) - 1),
                }
              }
              return d
            }),
          )
        }
        return result
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.submitReview')
        setError(message)
        showToast(message, 'error')
        throw err
      }
    },
    [cardsByDeck, getErrorMessage, showToast, studyService, updateDeckCache],
  )

  const getDueCardsSummary = useCallback(
    async (deckId: string): Promise<DueCardsSummary | null> => {
      try {
        return await studyService.getDueCardsSummary(deckId)
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.loadDueSummary')
        setError(message)
        showToast(message, 'error')
        return null
      }
    },
    [getErrorMessage, showToast, studyService],
  )

  const getCardBack = useCallback(
    async (cardId: string): Promise<CardBack> => {
      try {
        return await studyService.getCardBack(cardId)
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.loadCardBack')
        setError(message)
        showToast(message, 'error')
        throw err
      }
    },
    [getErrorMessage, showToast, studyService],
  )

  const getCardFront = useCallback(
    async (cardId: string): Promise<CardFront> => {
      try {
        return await studyService.getCardFront(cardId)
      } catch (err) {
        const message = getErrorMessage(err, 'dashboard:errors.loadCardFront')
        setError(message)
        showToast(message, 'error')
        throw err
      }
    },
    [getErrorMessage, showToast, studyService],
  )

  const getReviewPreview = useCallback(
    async (cardId: string): Promise<ReviewPreviewResponse> => {
      try {
        return await studyService.getReviewPreview(cardId)
      } catch (err) {
        const message = getErrorMessage(
          err,
          'dashboard:errors.loadReviewPreview',
        )
        setError(message)
        showToast(message, 'error')
        throw err
      }
    },
    [getErrorMessage, showToast, studyService],
  )

  const value = useMemo(
    (): StudyDataContextValue => ({
      decks,
      modules,
      cardsByDeck,
      loading,
      error,
      totalCardCount,
      refreshDecks,
      loadDeckCards,
      getDeckCards,
      handleCreateDeck,
      handleUpdateDeck,
      handleDeleteDeck,
      handleCreateModule,
      handleUpdateModule,
      handleDeleteModule,
      handleAddCard,
      handleUpdateCard,
      handleDeleteCard,
      handleSubmitReview,
      getDueCardsSummary,
      getCardFront,
      getCardBack,
      getReviewPreview,
      studyService,
    }),
    [
      decks,
      modules,
      cardsByDeck,
      loading,
      error,
      totalCardCount,
      refreshDecks,
      loadDeckCards,
      getDeckCards,
      handleCreateDeck,
      handleUpdateDeck,
      handleDeleteDeck,
      handleCreateModule,
      handleUpdateModule,
      handleDeleteModule,
      handleAddCard,
      handleUpdateCard,
      handleDeleteCard,
      handleSubmitReview,
      getDueCardsSummary,
      getCardFront,
      getCardBack,
      getReviewPreview,
      studyService,
    ],
  )

  return (
    <StudyDataContext.Provider value={value}>
      {children}
    </StudyDataContext.Provider>
  )
}

export function useStudyData(): StudyDataContextValue {
  const ctx = useContext(StudyDataContext)
  if (!ctx) {
    throw new Error('useStudyData must be used within StudyDataProvider')
  }
  return ctx
}
