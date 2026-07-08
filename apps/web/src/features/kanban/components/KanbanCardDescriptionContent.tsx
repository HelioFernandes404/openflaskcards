import { CheckCircle2 } from 'lucide-react'
import { MarkdownContent } from '@/shared/components/markdown-content'
import { splitKanbanDescription } from '../domain/kanbanCardContent'

interface KanbanCardDescriptionContentProps {
  description: string
  bodyTestId?: string
  doneConditionTestId?: string
}

export function KanbanCardDescriptionContent({
  description,
  bodyTestId = 'kanban-card-detail-body',
  doneConditionTestId = 'kanban-card-done-condition',
}: KanbanCardDescriptionContentProps) {
  const { body, doneCondition } = splitKanbanDescription(description)

  return (
    <>
      {body && (
        <div data-testid={bodyTestId}>
          <MarkdownContent content={body} variant="document" />
        </div>
      )}

      {doneCondition && (
        <div
          data-testid={doneConditionTestId}
          className="rounded-lg border border-outline bg-surface-container-low p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <CheckCircle2 size={16} strokeWidth={1.5} />
            Done condition
          </div>
          <MarkdownContent content={doneCondition} variant="document" />
        </div>
      )}
    </>
  )
}
