import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { buildCardFrontFromCard } from '@/features/cards/domain/cardContent'
import {
  buildPreviewBack,
  buildPreviewFront,
  cardToEditDraft,
  draftsEqual,
  type CardEditDraft,
} from '@/features/cards/domain/cardPreview'
import type {
  Card,
  CardFront,
  CardBack,
  CardUpdateInput,
  DueCardsSummary,
} from '@/features/cards/types/card'
import type { ReviewPreviewResponse } from '@/features/study/types/preview'
import type { Deck } from '@/features/decks/types/deck'
import {
  appendReview,
  buildSessionSummary,
  createEmptySessionStats,
  RATING_ANIMATION_MS,
  type StudySessionStats,
  type StudySessionSummary,
  type ReviewRating,
  type StoredSessionSnapshot,
} from '@/features/study/domain/sessionGamification'
import {
  getLastSessionSnapshot,
  getStudySessionPreferences,
  saveLastSessionSnapshot,
  saveStudySessionPreferences,
  type StudySessionPreferences,
} from '@/features/study/services/studySessionPreferences'
import { playStudySessionSound } from '@/features/study/utils/studySessionSounds'

export type StudySessionPhase = 'loading' | 'active' | 'finished' | 'empty'

export type StudySessionKeyAction = 'flip' | 1 | 2 | 3 | 4

export function resolveStudySessionKeyAction(
  key: string,
  code: string,
  isFlipped: boolean,
): StudySessionKeyAction | null {
  if (isFlipped) {
    const ratingByKey: Record<string, 1 | 2 | 3 | 4> = {
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
    }
    const ratingByCode: Record<string, 1 | 2 | 3 | 4> = {
      KeyQ: 1,
      KeyW: 2,
      KeyE: 3,
      KeyR: 4,
    }

    return ratingByCode[code] ?? ratingByKey[key] ?? null
  }

  if (code === 'Space' || key === ' ') {
    return 'flip'
  }

  return null
}

export function shouldIgnoreStudySessionHotkey(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    Boolean(target.isContentEditable)
  )
}

export interface StudySessionQuotaInfo
  extends Omit<DueCardsSummary, 'cards' | 'totalDue'> {}

export interface StudySessionController {
  phase: StudySessionPhase
  deck: Deck | undefined
  cardFronts: CardFront[]
  currentFront: CardFront | null
  currentBack: CardBack | null
  preview: ReviewPreviewResponse | null
  quotaInfo: StudySessionQuotaInfo | null
  timerSeconds: number
  isFlipped: boolean
  isLoadingBack: boolean
  isSubmitting: boolean
  currentCardIndex: number
  flip: () => Promise<void>
  rate: (rating: 1 | 2 | 3 | 4) => Promise<void>
  exit: () => void
  isEditOpen: boolean
  editingCard: Card | null
  isLoadingEditCard: boolean
  isUpdatingCard: boolean
  openEdit: () => Promise<void>
  closeEdit: () => void
  saveEdit: (cardId: string, data: CardUpdateInput) => Promise<void>
  updateEditDraft: (draft: CardEditDraft) => void
  combo: number
  sessionSummary: StudySessionSummary | null
  previousSession: StoredSessionSnapshot | null
  ratingAnimation: { rating: ReviewRating; key: number } | null
  preferences: StudySessionPreferences
  autoFlipRemainingSeconds: number | null
  toggleSound: () => void
  toggleAutoFlip: () => void
}

export { formatStudyTimer } from '@/features/study/domain/sessionGamification'

export function useStudySession(
  deckId: string | undefined,
): StudySessionController {
  const navigate = useNavigate()
  const {
    decks,
    getDueCardsSummary,
    getCardBack,
    handleSubmitReview,
    handleUpdateCard,
    getReviewPreview,
    studyService,
    loading: providerLoading,
  } = useStudyData()
  const { showToast } = useNotification()

  const deck = decks.find((item) => item.id === deckId)

  const [cardFronts, setCardFronts] = useState<CardFront[]>([])
  const [quotaInfo, setQuotaInfo] = useState<StudySessionQuotaInfo | null>(null)
  const [currentCardBack, setCurrentCardBack] = useState<CardBack | null>(null)
  const [preview, setPreview] = useState<ReviewPreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingBack, setLoadingBack] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [editDraft, setEditDraft] = useState<CardEditDraft | null>(null)
  const [isLoadingEditCard, setIsLoadingEditCard] = useState(false)
  const [sessionStats, setSessionStats] = useState<StudySessionStats>(
    createEmptySessionStats,
  )
  const [previousSession, setPreviousSession] =
    useState<StoredSessionSnapshot | null>(null)
  const [preferences, setPreferences] = useState<StudySessionPreferences>(() =>
    getStudySessionPreferences(),
  )
  const [ratingAnimation, setRatingAnimation] = useState<{
    rating: ReviewRating
    key: number
  } | null>(null)
  const [autoFlipRemainingSeconds, setAutoFlipRemainingSeconds] = useState<
    number | null
  >(null)
  const cardStartedAtRef = useRef(Date.now())
  const ratingAnimationKeyRef = useRef(0)
  const summaryPersistedRef = useRef(false)
  const flipRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    let cancelled = false

    const loadDueCards = async () => {
      if (!deckId) return
      setLoading(true)
      setCurrentCardIndex(0)
      setIsFlipped(false)
      setCurrentCardBack(null)
      setPreview(null)
      try {
        const summary = await getDueCardsSummary(deckId)
        if (cancelled) return
        if (summary) {
          setCardFronts(summary.cards)
          setQuotaInfo({
            newCardsDailyLimit: summary.newCardsDailyLimit,
            newCardsStudiedToday: summary.newCardsStudiedToday,
            remainingNewCardsToday: summary.remainingNewCardsToday,
            isNewCardsLimitReached: summary.isNewCardsLimitReached,
          })
        } else {
          setCardFronts([])
        }
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load due cards:', error)
        showToast(
          getUserFacingErrorMessage(error, {
            fallbackKey: 'dashboard:errors.loadDueCards',
          }),
          'error',
        )
        setCardFronts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDueCards()

    return () => {
      cancelled = true
    }
  }, [deckId, getDueCardsSummary, showToast])

  useEffect(() => {
    if (!deckId) return
    setPreviousSession(getLastSessionSnapshot(deckId))
  }, [deckId])

  const currentFront = cardFronts[currentCardIndex] ?? null

  const displayedFront = useMemo(() => {
    if (isEditOpen && editingCard && editDraft) {
      return buildPreviewFront(editingCard, editDraft)
    }
    return currentFront
  }, [isEditOpen, editingCard, editDraft, currentFront])

  const displayedBack = useMemo(() => {
    if (isEditOpen && editingCard && editDraft && isFlipped) {
      return buildPreviewBack(editingCard, editDraft)
    }
    return currentCardBack
  }, [isEditOpen, editingCard, editDraft, isFlipped, currentCardBack])
  const isFinished =
    currentCardIndex >= cardFronts.length && cardFronts.length > 0

  useEffect(() => {
    cardStartedAtRef.current = Date.now()
  }, [currentCardIndex, currentFront?.id])

  const phase = useMemo((): StudySessionPhase => {
    if (loading) return 'loading'
    if (cardFronts.length === 0) return 'empty'
    if (isFinished) return 'finished'
    return 'active'
  }, [loading, cardFronts.length, isFinished])

  const sessionSummary = useMemo(() => {
    if (phase !== 'finished') return null
    return buildSessionSummary(sessionStats, timerSeconds, cardFronts.length)
  }, [phase, sessionStats, timerSeconds, cardFronts.length])

  useEffect(() => {
    if (phase !== 'active') return
    const interval = setInterval(
      () => setTimerSeconds((value) => value + 1),
      1000,
    )
    return () => clearInterval(interval)
  }, [phase])

  const flip = useCallback(async () => {
    if (!currentFront || loadingBack || isFlipped) return
    setLoadingBack(true)
    setAutoFlipRemainingSeconds(null)
    try {
      const [back, previewData] = await Promise.all([
        getCardBack(currentFront.id),
        getReviewPreview(currentFront.id),
      ])
      setCurrentCardBack(back)
      setPreview(previewData)
      setIsFlipped(true)
      playStudySessionSound('flip', preferences.soundEnabled)
    } catch (error) {
      console.error('Failed to load card back or preview:', error)
      showToast(
        getUserFacingErrorMessage(error, {
          fallbackKey: 'dashboard:errors.loadCardBack',
        }),
        'error',
      )
    } finally {
      setLoadingBack(false)
    }
  }, [
    currentFront,
    getCardBack,
    getReviewPreview,
    isFlipped,
    loadingBack,
    preferences.soundEnabled,
    showToast,
  ])

  flipRef.current = flip

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (isSubmitting || !currentFront || !isFlipped) return
      setIsSubmitting(true)
      setAutoFlipRemainingSeconds(null)

      ratingAnimationKeyRef.current += 1
      setRatingAnimation({ rating, key: ratingAnimationKeyRef.current })
      playStudySessionSound(rating, preferences.soundEnabled)

      const durationMs = Date.now() - cardStartedAtRef.current

      try {
        await Promise.all([
          handleSubmitReview(currentFront.id, rating, durationMs),
          new Promise((resolve) => {
            window.setTimeout(resolve, RATING_ANIMATION_MS)
          }),
        ])

        const { stats: nextStats, milestone } = appendReview(sessionStats, {
          cardId: currentFront.id,
          rating,
          durationMs,
        })

        if (milestone) {
          playStudySessionSound('combo', preferences.soundEnabled)
          showToast(`${milestone} Good/Easy in a row!`, 'success')
        }

        setSessionStats(nextStats)

        if (currentFront.state === 'new') {
          setQuotaInfo((prev) => {
            if (!prev) return prev
            const newCardsStudiedToday = prev.newCardsStudiedToday + 1
            const remainingNewCardsToday = Math.max(
              0,
              prev.newCardsDailyLimit - newCardsStudiedToday,
            )
            return {
              ...prev,
              newCardsStudiedToday,
              remainingNewCardsToday,
              isNewCardsLimitReached: remainingNewCardsToday === 0,
            }
          })
        }
        setIsFlipped(false)
        setCurrentCardBack(null)
        setPreview(null)
        setRatingAnimation(null)
        setCurrentCardIndex((prev) => prev + 1)
      } catch (error) {
        console.error('Failed to submit review:', error)
        setRatingAnimation(null)
        showToast(
          getUserFacingErrorMessage(error, {
            fallbackKey: 'dashboard:errors.submitReview',
          }),
          'error',
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      currentFront,
      handleSubmitReview,
      isFlipped,
      isSubmitting,
      preferences.soundEnabled,
      sessionStats,
      showToast,
    ],
  )

  useEffect(() => {
    if (phase !== 'active' || isEditOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreStudySessionHotkey(event.target)) return

      const action = resolveStudySessionKeyAction(
        event.key,
        event.code,
        isFlipped,
      )
      if (!action) return

      if (action === 'flip') {
        if (loadingBack) return
        event.preventDefault()
        void flip()
        return
      }

      if (isSubmitting) return
      event.preventDefault()
      void rate(action)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, isEditOpen, isFlipped, isSubmitting, loadingBack, flip, rate])

  useEffect(() => {
    if (!sessionSummary || !deckId || summaryPersistedRef.current) return

    saveLastSessionSnapshot({
      deckId,
      totalCards: sessionSummary.totalCards,
      timerSeconds: sessionSummary.timerSeconds,
      successRate: sessionSummary.successRate,
      maxCombo: sessionSummary.maxCombo,
      finishedAt: new Date().toISOString(),
    })
    summaryPersistedRef.current = true
  }, [sessionSummary, deckId])

  useEffect(() => {
    if (
      phase !== 'active' ||
      isFlipped ||
      isEditOpen ||
      loadingBack ||
      !preferences.autoFlipEnabled
    ) {
      setAutoFlipRemainingSeconds(null)
      return
    }

    setAutoFlipRemainingSeconds(preferences.autoFlipSeconds)

    const interval = window.setInterval(() => {
      setAutoFlipRemainingSeconds((current) => {
        if (current === null) return current
        if (current <= 1) {
          queueMicrotask(() => void flipRef.current())
          return null
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [
    phase,
    isFlipped,
    isEditOpen,
    loadingBack,
    preferences.autoFlipEnabled,
    preferences.autoFlipSeconds,
    currentCardIndex,
    currentFront?.id,
  ])

  const toggleSound = useCallback(() => {
    setPreferences((current) => {
      const next = { ...current, soundEnabled: !current.soundEnabled }
      saveStudySessionPreferences(next)
      return next
    })
  }, [])

  const toggleAutoFlip = useCallback(() => {
    setPreferences((current) => {
      const next = { ...current, autoFlipEnabled: !current.autoFlipEnabled }
      saveStudySessionPreferences(next)
      return next
    })
  }, [])

  const exit = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  const applyUpdatedCardToSession = useCallback(
    async (updatedCard: Card, flipped: boolean) => {
      const front = buildCardFrontFromCard(updatedCard)
      setCardFronts((prev) =>
        prev.map((card) => (card.id === updatedCard.id ? front : card)),
      )

      if (flipped) {
        const back = await getCardBack(updatedCard.id)
        setCurrentCardBack(back)
      }
    },
    [getCardBack],
  )

  const openEdit = useCallback(async () => {
    if (!currentFront) return
    setIsLoadingEditCard(true)
    try {
      const card = await studyService.getCard(currentFront.id)
      setEditingCard(card)
      setEditDraft(cardToEditDraft(card))
      setIsEditOpen(true)
    } catch (error) {
      console.error('Failed to load card for edit:', error)
      showToast(
        getUserFacingErrorMessage(error, {
          fallbackKey: 'dashboard:errors.loadCardFront',
        }),
        'error',
      )
    } finally {
      setIsLoadingEditCard(false)
    }
  }, [currentFront, showToast, studyService])

  const closeEdit = useCallback(() => {
    if (providerLoading.updateCard) return
    setIsEditOpen(false)
    setEditingCard(null)
    setEditDraft(null)
  }, [providerLoading.updateCard])

  const updateEditDraft = useCallback((draft: CardEditDraft) => {
    setEditDraft((prev) => (prev && draftsEqual(prev, draft) ? prev : draft))
  }, [])

  const saveEdit = useCallback(
    async (cardId: string, data: CardUpdateInput) => {
      const updatedCard = await handleUpdateCard(cardId, data)
      await applyUpdatedCardToSession(updatedCard, isFlipped)
    },
    [applyUpdatedCardToSession, handleUpdateCard, isFlipped],
  )

  return {
    phase,
    deck,
    cardFronts,
    currentFront: displayedFront,
    currentBack: displayedBack,
    preview,
    quotaInfo,
    timerSeconds,
    isFlipped,
    isLoadingBack: loadingBack,
    isSubmitting,
    currentCardIndex,
    flip,
    rate,
    exit,
    isEditOpen,
    editingCard,
    isLoadingEditCard,
    isUpdatingCard: providerLoading.updateCard,
    openEdit,
    closeEdit,
    saveEdit,
    updateEditDraft,
    combo: sessionStats.combo,
    sessionSummary,
    previousSession,
    ratingAnimation,
    preferences,
    autoFlipRemainingSeconds,
    toggleSound,
    toggleAutoFlip,
  }
}
