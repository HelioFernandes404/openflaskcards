import { Clock, Edit, MoreVertical, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu'
import type { Note } from '../types/note'

interface NoteCardProps {
  note: Note
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function NoteCard({ note, onOpen, onEdit, onDelete }: NoteCardProps) {
  return (
    <Card
      className="flex flex-col group h-full relative overflow-hidden transition-all hover:border-outline-strong cursor-pointer"
      data-testid={`note-item-${note.id}`}
      onClick={() => onOpen(note.id)}
    >
      <CardContent className="p-4 flex flex-col h-full gap-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3
              className="text-base font-semibold tracking-tight mb-1 line-clamp-1 text-on-surface"
              title={note.title}
            >
              {note.title}
            </h3>
            <p className="font-mono text-2xs text-on-surface-variant flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {`Updated ${formatUpdatedAt(note.updatedAt)}`}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`note-item-menu-button-${note.id}`}
                aria-label="Note actions"
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 hover:bg-surface-container-high rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-on-surface shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical
                  size={16}
                  className="text-on-surface-variant"
                  strokeWidth={1.5}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                data-testid={`note-item-edit-button-${note.id}`}
                onClick={() => onEdit(note.id)}
              >
                <Edit size={14} strokeWidth={1.5} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid={`note-item-delete-button-${note.id}`}
                className="text-error focus:text-error"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-on-surface-variant line-clamp-4 whitespace-pre-wrap">
          {note.content || 'No content yet.'}
        </p>
      </CardContent>
    </Card>
  )
}
