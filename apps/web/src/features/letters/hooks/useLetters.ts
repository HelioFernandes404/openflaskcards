import { useCallback, useEffect, useState } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import type {
  Letter,
  LetterCreateInput,
  LetterUpdateInput,
} from '../types/letter'

export function useLetters() {
  const { studyService } = useStudyData()
  const { showToast } = useNotification()
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLetters(await studyService.getLetters())
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'Failed to load letters.',
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [studyService])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createLetter = useCallback(
    async (data: LetterCreateInput) => {
      try {
        const letter = await studyService.createLetter(data)
        setLetters((prev) => [letter, ...prev])
        return letter
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'Failed to create letter.',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const updateLetter = useCallback(
    async (letterId: string, data: LetterUpdateInput) => {
      try {
        const updated = await studyService.updateLetter(letterId, data)
        setLetters((prev) =>
          prev.map((letter) => (letter.id === letterId ? updated : letter)),
        )
        return updated
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'Failed to update letter.',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const deleteLetter = useCallback(
    async (letterId: string) => {
      try {
        await studyService.deleteLetter(letterId)
        setLetters((prev) => prev.filter((letter) => letter.id !== letterId))
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'Failed to delete letter.',
          }),
          'error',
        )
      }
    },
    [studyService, showToast],
  )

  return {
    letters,
    loading,
    error,
    refresh,
    createLetter,
    updateLetter,
    deleteLetter,
  }
}
