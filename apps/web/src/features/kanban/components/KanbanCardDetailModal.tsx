import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Edit,
  Trash2,
} from 'lucide-react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Badge } from '@/shared/components/badge'
import { MarkdownContent } from '@/shared/components/markdown-content'
import {
  KANBAN_COLUMNS,
  KANBAN_TYPES,
  type KanbanCard,
} from '../types/kanbanCard'
import { KanbanCardDescriptionContent } from './KanbanCardDescriptionContent'

const PRIORITY_LABEL: Record<KanbanCard['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PRIORITY_VARIANT: Record<
  KanbanCard['priority'],
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

const TYPE_LABEL: Record<KanbanCard['type'], string> = Object.fromEntries(
  KANBAN_TYPES.map((t) => [t.type, t.label]),
) as Record<KanbanCard['type'], string>

const TYPE_VARIANT: Record<
  KanbanCard['type'],
  'neutral' | 'outlined' | 'default'
> = {
  bug: 'default',
  feature: 'outlined',
  tech_debt: 'neutral',
  chore: 'neutral',
}

const STATUS_LABEL: Record<KanbanCard['status'], string> = Object.fromEntries(
  KANBAN_COLUMNS.map((c) => [c.status, c.label]),
) as Record<KanbanCard['status'], string>

interface KanbanCardDetailModalProps {
  card: KanbanCard
  isOpen: boolean
  canMoveBack: boolean
  canMoveForward: boolean
  onClose: () => void
  onEdit: (card: KanbanCard) => void
  onDelete: (id: string) => void
  onMoveBack: (id: string) => void
  onMoveForward: (id: string) => void
}

export function KanbanCardDetailModal({
  card,
  isOpen,
  canMoveBack,
  canMoveForward,
  onClose,
  onEdit,
  onDelete,
  onMoveBack,
  onMoveForward,
}: KanbanCardDetailModalProps) {
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={card.title} maxWidth="3xl">
      <div
        className="flex flex-col gap-5"
        data-testid="kanban-card-detail-modal"
      >
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
          <Badge variant="outlined">{STATUS_LABEL[card.status]}</Badge>
        </div>

        <KanbanCardDescriptionContent description={card.description} />

        {card.status === 'in_progress' && card.verificationNote && (
          <div
            data-testid="kanban-card-verification-note"
            className="rounded-lg border border-warning-600/30 bg-warning-600/5 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning-600">
              <AlertTriangle size={16} strokeWidth={1.5} />
              Verification note
            </div>
            <MarkdownContent
              content={card.verificationNote}
              variant="document"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-outline">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="neutral"
              size="icon"
              data-testid="kanban-card-detail-move-back"
              aria-label="Move to previous column"
              disabled={!canMoveBack}
              onClick={() => onMoveBack(card.id)}
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="icon"
              data-testid="kanban-card-detail-move-forward"
              aria-label="Move to next column"
              disabled={!canMoveForward}
              onClick={() => onMoveForward(card.id)}
            >
              <ArrowRight size={16} strokeWidth={1.5} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="neutral"
              data-testid="kanban-card-detail-edit"
              className="gap-2"
              onClick={() => onEdit(card)}
            >
              <Edit size={14} strokeWidth={1.5} />
              Edit
            </Button>
            <Button
              type="button"
              variant="neutral"
              data-testid="kanban-card-detail-delete"
              className="gap-2 text-error hover:text-error"
              onClick={() => onDelete(card.id)}
            >
              <Trash2 size={14} strokeWidth={1.5} />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
