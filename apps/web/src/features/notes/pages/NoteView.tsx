import { useEffect, useState } from 'react'
import { Edit } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { Button } from '@/shared/components/button'
import { Card, CardContent } from '@/shared/components/card'
import { EmptyState } from '@/shared/components/empty-state'
import { MarkdownContent } from '@/shared/components/markdown-content'
import { Skeleton } from '@/shared/components/skeleton'
import { PageHeader } from '@/shared/layout/PageHeader'
import type { Note } from '../types/note'

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function NoteView() {
  const { noteId } = useParams({ strict: false })
  const navigate = useNavigate()
  const { studyService } = useStudyData()
  const { showToast } = useNotification()

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!noteId) return
    let cancelled = false

    setLoading(true)
    studyService
      .getNote(noteId)
      .then((loaded) => {
        if (!cancelled) setNote(loaded)
      })
      .catch((err) => {
        if (cancelled) return
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.loadNote',
          }),
          'error',
        )
        navigate({ to: '/notes' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [noteId, studyService, showToast, navigate])

  if (!noteId) return null

  return (
    <div
      className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="note-view-page"
    >
      <PageHeader
        title={note?.title ?? 'Note'}
        subtitle={
          note
            ? `Updated ${formatUpdatedAt(note.updatedAt)}`
            : 'Loading note...'
        }
        backTo="/notes"
        actions={
          note ? (
            <Button
              type="button"
              variant="neutral"
              className="gap-2"
              data-testid="note-view-edit-button"
              onClick={() =>
                navigate({
                  to: '/notes/$noteId/edit',
                  params: { noteId: note.id },
                })
              }
            >
              <Edit size={16} />
              Edit
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <Card>
          <CardContent className="space-y-4 p-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </CardContent>
        </Card>
      ) : !note ? null : !note.content.trim() ? (
        <EmptyState
          title="No content yet"
          hint="Edit this note to add something worth remembering."
          action={
            <Button
              type="button"
              className="gap-2"
              onClick={() =>
                navigate({
                  to: '/notes/$noteId/edit',
                  params: { noteId: note.id },
                })
              }
            >
              <Edit size={16} />
              Edit
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-8">
            <MarkdownContent content={note.content} variant="document" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
