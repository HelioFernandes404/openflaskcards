import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { Card, CardContent } from '@/shared/components/card'
import { PageHeader } from '@/shared/layout/PageHeader'
import { useNotes } from '../hooks/useNotes'

export function NoteEditor() {
  const navigate = useNavigate()
  const { noteId } = useParams({ strict: false })
  const isEditing = Boolean(noteId)
  const { studyService } = useStudyData()
  const { showToast } = useNotification()
  const { createNote, updateNote } = useNotes()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loadingNote, setLoadingNote] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!noteId) return
    let cancelled = false
    setLoadingNote(true)
    studyService
      .getNote(noteId)
      .then((note) => {
        if (cancelled) return
        setTitle(note.title)
        setContent(note.content)
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
        if (!cancelled) setLoadingNote(false)
      })
    return () => {
      cancelled = true
    }
  }, [noteId, studyService, showToast, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      // createNote/updateNote already toast the error and return null on
      // failure — only navigate away (discarding the draft) on success.
      const saved = noteId
        ? await updateNote(noteId, { title: title.trim(), content })
        : await createNote({ title: title.trim(), content })
      if (saved)
        navigate({
          to: '/notes/$noteId',
          params: { noteId: saved.id },
        })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="note-editor-page"
    >
      <PageHeader
        title={isEditing ? 'Edit Note' : 'New Note'}
        subtitle={
          isEditing ? 'Update your note' : 'Write something worth remembering'
        }
        backTo="/notes"
      />

      <Card>
        <CardContent className="p-8">
          {loadingNote ? (
            <p className="text-sm text-on-surface-variant">Loading...</p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
              data-testid="note-editor-form"
            >
              <div>
                <Label htmlFor="note-title" className="block mb-2">
                  Title
                </Label>
                <Input
                  id="note-title"
                  data-testid="note-title-input"
                  type="text"
                  className="text-xl"
                  placeholder="e.g. Song flashcard ideas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="note-content" className="block mb-2">
                  Content (Markdown)
                </Label>
                <Textarea
                  id="note-content"
                  data-testid="note-content-input"
                  className="min-h-[320px] font-mono text-sm"
                  placeholder="Write your note here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="neutral"
                  data-testid="note-editor-cancel-button"
                  className="flex-1 py-3 text-lg"
                  onClick={() => navigate({ to: '/notes' })}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="note-editor-submit-button"
                  className="flex-[2] py-3 text-lg gap-2"
                  disabled={saving || !title.trim()}
                >
                  <Save size={20} /> {saving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
