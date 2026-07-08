import { useCallback, useEffect, useState } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import type {
  KanbanCard,
  KanbanCardCreateInput,
  KanbanCardUpdateInput,
} from '../types/kanbanCard'

export function useKanban() {
  const { studyService } = useStudyData()
  const { showToast } = useNotification()
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCards(await studyService.getKanbanCards())
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'dashboard:errors.loadKanbanCards',
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [studyService])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createKanbanCard = useCallback(
    async (data: KanbanCardCreateInput) => {
      try {
        const card = await studyService.createKanbanCard(data)
        setCards((prev) => [...prev, card])
        return card
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.createKanbanCard',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const updateKanbanCard = useCallback(
    async (cardId: string, data: KanbanCardUpdateInput) => {
      try {
        const updated = await studyService.updateKanbanCard(cardId, data)
        setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)))
        return updated
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.updateKanbanCard',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const deleteKanbanCard = useCallback(
    async (cardId: string) => {
      try {
        await studyService.deleteKanbanCard(cardId)
        setCards((prev) => prev.filter((c) => c.id !== cardId))
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.deleteKanbanCard',
          }),
          'error',
        )
      }
    },
    [studyService, showToast],
  )

  return {
    cards,
    loading,
    error,
    refresh,
    createKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
  }
}
