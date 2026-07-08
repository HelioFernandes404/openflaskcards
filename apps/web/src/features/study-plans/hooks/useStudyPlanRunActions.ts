import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getDeckDueToday } from '@/features/decks/utils/deckCounts'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'

export function useStudyPlanRunActions() {
  const navigate = useNavigate()
  const { decks, getDueCardsSummary } = useStudyData()
  const { showToast } = useNotification()

  const startFlashcards = useCallback(async () => {
    if (decks.length === 0) {
      showToast('Create a deck first to study flashcards.', 'info')
      navigate({ to: '/decks/create' })
      return
    }

    const bestDeck = [...decks].sort(
      (left, right) => getDeckDueToday(right) - getDeckDueToday(left),
    )[0]
    const summary = await getDueCardsSummary(bestDeck.id)

    if (!summary?.cards.length) {
      showToast(
        'No cards due right now — try another step or come back later.',
        'info',
      )
      return
    }

    navigate({ to: '/decks/$deckId/study', params: { deckId: bestDeck.id } })
  }, [decks, getDueCardsSummary, navigate, showToast])

  const openWriting = useCallback(() => {
    navigate({ to: '/notes/create' })
  }, [navigate])

  const openErrorNotebook = useCallback(() => {
    navigate({ to: '/notes' })
  }, [navigate])

  const openLetters = useCallback(() => {
    navigate({ to: '/letters' })
  }, [navigate])

  return { startFlashcards, openWriting, openErrorNotebook, openLetters }
}
