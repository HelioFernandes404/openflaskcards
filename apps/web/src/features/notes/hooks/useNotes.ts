import { useCallback, useEffect, useState } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import type { Note, NoteCreateInput, NoteUpdateInput } from '../types/note'

export function useNotes() {
  const { studyService } = useStudyData()
  const { showToast } = useNotification()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setNotes(await studyService.getNotes())
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'dashboard:errors.loadNotes',
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [studyService])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createNote = useCallback(
    async (data: NoteCreateInput) => {
      try {
        const note = await studyService.createNote(data)
        setNotes((prev) => [note, ...prev])
        return note
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.createNote',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const updateNote = useCallback(
    async (noteId: string, data: NoteUpdateInput) => {
      try {
        const updated = await studyService.updateNote(noteId, data)
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)))
        return updated
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.updateNote',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        await studyService.deleteNote(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.deleteNote',
          }),
          'error',
        )
      }
    },
    [studyService, showToast],
  )

  return { notes, loading, error, refresh, createNote, updateNote, deleteNote }
}
