import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { SkeletonCard } from '@/shared/components/skeleton'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { useNotes } from '../hooks/useNotes'
import { NoteCard } from '../components/NoteCard'

export function NotesList() {
  const navigate = useNavigate()
  const { notes, loading, deleteNote } = useNotes()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleConfirmDelete = () => {
    if (pendingDeleteId) deleteNote(pendingDeleteId)
    setPendingDeleteId(null)
  }

  return (
    <div
      className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="notes-list-page"
    >
      <PageHeader
        title="Notes"
        subtitle="Freeform notes for anything worth remembering"
        backTo="/"
        actions={
          <Button
            data-testid="new-note-button"
            className="gap-2"
            onClick={() => navigate({ to: '/notes/create' })}
          >
            <Plus size={16} /> New Note
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          hint="Create your first note to keep something you don't want to lose."
          action={
            <Button
              className="gap-2"
              onClick={() => navigate({ to: '/notes/create' })}
            >
              <Plus size={16} /> New Note
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={(id) =>
                navigate({ to: '/notes/$noteId', params: { noteId: id } })
              }
              onEdit={(id) =>
                navigate({
                  to: '/notes/$noteId/edit',
                  params: { noteId: id },
                })
              }
              onDelete={(id) => setPendingDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete note"
        message="This note will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
