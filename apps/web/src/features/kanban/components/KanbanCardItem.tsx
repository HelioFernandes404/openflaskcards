import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Edit,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import { Badge } from '@/shared/components/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu'
import { kanbanDescriptionPreview } from '../domain/kanbanCardContent'
import {
  KANBAN_TYPES,
  type KanbanCard as KanbanCardType,
} from '../types/kanbanCard'

const PRIORITY_LABEL: Record<KanbanCardType['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PRIORITY_VARIANT: Record<
  KanbanCardType['priority'],
  'neutral' | 'outlined' | 'default'
> = {
  low: 'neutral',
  medium: 'outlined',
  high: 'default',
}

const ASSIGNEE_LABEL: Record<string, string> = {
  human: 'Human',
  claude_code: 'Claude Code',
}

const TYPE_LABEL: Record<KanbanCardType['type'], string> = Object.fromEntries(
  KANBAN_TYPES.map((t) => [t.type, t.label]),
) as Record<KanbanCardType['type'], string>

const TYPE_VARIANT: Record<
  KanbanCardType['type'],
  'neutral' | 'outlined' | 'default'
> = {
  bug: 'default',
  feature: 'outlined',
  tech_debt: 'neutral',
  chore: 'neutral',
}

interface KanbanCardItemProps {
  card: KanbanCardType
  canMoveBack: boolean
  canMoveForward: boolean
  onMoveBack: (id: string) => void
  onMoveForward: (id: string) => void
  onOpen: (card: KanbanCardType) => void
  onEdit: (card: KanbanCardType) => void
  onDelete: (id: string) => void
}

export function KanbanCardItem({
  card,
  canMoveBack,
  canMoveForward,
  onMoveBack,
  onMoveForward,
  onOpen,
  onEdit,
  onDelete,
}: KanbanCardItemProps) {
  const preview = kanbanDescriptionPreview(card.description)

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:border-outline-strong cursor-pointer"
      data-testid={`kanban-card-${card.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(card)
        }
      }}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-2">
          <h3
            className="text-sm font-semibold tracking-tight line-clamp-2 text-on-surface"
            title={card.title}
          >
            {card.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid={`kanban-card-menu-button-${card.id}`}
                aria-label="Card actions"
                className="p-1.5 hover:bg-surface-container-high rounded-md cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-on-surface"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <MoreVertical
                  size={16}
                  className="text-on-surface-variant"
                  strokeWidth={1.5}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                data-testid={`kanban-card-edit-button-${card.id}`}
                onClick={() => onEdit(card)}
              >
                <Edit size={14} strokeWidth={1.5} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid={`kanban-card-delete-button-${card.id}`}
                className="text-error focus:text-error"
                onClick={() => onDelete(card.id)}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {preview && (
          <p className="text-xs text-on-surface-variant line-clamp-2">
            {preview}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={TYPE_VARIANT[card.type]}>
            {TYPE_LABEL[card.type]}
          </Badge>
          <Badge variant={PRIORITY_VARIANT[card.priority]}>
            {PRIORITY_LABEL[card.priority]}
          </Badge>
          <Badge variant="neutral">
            {card.assignee ? ASSIGNEE_LABEL[card.assignee] : 'Unassigned'}
          </Badge>
        </div>

        {card.status === 'in_progress' && card.verificationNote && (
          <p className="text-xs text-warning-600 flex items-start gap-1.5">
            <AlertTriangle
              size={14}
              strokeWidth={1.5}
              className="shrink-0 mt-0.5"
            />
            {card.verificationNote}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            aria-label="Move to previous column"
            disabled={!canMoveBack}
            onClick={(e) => {
              e.stopPropagation()
              onMoveBack(card.id)
            }}
            className="p-1.5 rounded-md hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-on-surface"
          >
            <ArrowLeft
              size={16}
              className="text-on-surface-variant"
              strokeWidth={1.5}
            />
          </button>
          <button
            type="button"
            aria-label="Move to next column"
            disabled={!canMoveForward}
            onClick={(e) => {
              e.stopPropagation()
              onMoveForward(card.id)
            }}
            className="p-1.5 rounded-md hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-on-surface"
          >
            <ArrowRight
              size={16}
              className="text-on-surface-variant"
              strokeWidth={1.5}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
