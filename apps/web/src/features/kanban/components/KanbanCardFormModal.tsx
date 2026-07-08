import { useEffect, useState } from 'react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { Select } from '@/shared/components/select'
import { cn } from '@/shared/utils'
import { KanbanCardDescriptionContent } from './KanbanCardDescriptionContent'
import {
  KANBAN_COLUMNS,
  KANBAN_TYPES,
  type KanbanCard,
  type KanbanCardCreateInput,
  type KanbanCardUpdateInput,
  type KanbanPriority,
  type KanbanStatus,
  type KanbanType,
} from '../types/kanbanCard'

interface KanbanCardFormModalProps {
  isOpen: boolean
  card: KanbanCard | null
  initialStatus: KanbanStatus
  onClose: () => void
  onCreate: (data: KanbanCardCreateInput) => Promise<unknown>
  onUpdate: (id: string, data: KanbanCardUpdateInput) => Promise<unknown>
}

const PRIORITY_OPTIONS: Array<{ value: KanbanPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const DESCRIPTION_PLACEHOLDER = `## Context
Files: \`apps/api/internal/...\`
Current vs expected behavior...

## Done condition
\`\`\`bash
cd apps/api && make test
\`\`\`
Expected: new TestX passes.`

type DescriptionTab = 'write' | 'preview'

export function KanbanCardFormModal({
  isOpen,
  card,
  initialStatus,
  onClose,
  onCreate,
  onUpdate,
}: KanbanCardFormModalProps) {
  const isEditing = Boolean(card)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<KanbanStatus>('backlog')
  const [priority, setPriority] = useState<KanbanPriority>('medium')
  const [assignee, setAssignee] = useState<'' | 'human' | 'claude_code'>('')
  const [type, setType] = useState<KanbanType>('feature')
  const [saving, setSaving] = useState(false)
  const [descriptionTab, setDescriptionTab] = useState<DescriptionTab>('write')

  useEffect(() => {
    if (!isOpen) return
    setTitle(card?.title ?? '')
    setDescription(card?.description ?? '')
    setStatus(card?.status ?? initialStatus)
    setPriority(card?.priority ?? 'medium')
    setAssignee(card?.assignee ?? '')
    setType(card?.type ?? 'feature')
    setDescriptionTab('write')
  }, [isOpen, card, initialStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description,
        status,
        priority,
        assignee: assignee || undefined,
        type,
      }
      await (card ? onUpdate(card.id, payload) : onCreate(payload))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Card' : 'New Card'}
      maxWidth="2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        data-testid="kanban-card-form"
      >
        <div>
          <Label htmlFor="kanban-card-title" className="block mb-2">
            Title
          </Label>
          <Input
            id="kanban-card-title"
            data-testid="kanban-card-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fix login bug"
            autoFocus
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label htmlFor="kanban-card-description">Description</Label>
            <div className="flex rounded-md border border-outline p-0.5">
              <button
                type="button"
                data-testid="kanban-card-description-tab-write"
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  descriptionTab === 'write'
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
                onClick={() => setDescriptionTab('write')}
              >
                Write
              </button>
              <button
                type="button"
                data-testid="kanban-card-description-tab-preview"
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  descriptionTab === 'preview'
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
                onClick={() => setDescriptionTab('preview')}
              >
                Preview
              </button>
            </div>
          </div>

          {descriptionTab === 'write' ? (
            <Textarea
              id="kanban-card-description"
              data-testid="kanban-card-description-input"
              className="min-h-[180px] font-mono text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={DESCRIPTION_PLACEHOLDER}
            />
          ) : (
            <div
              data-testid="kanban-card-description-preview"
              className="min-h-[180px] rounded-md border border-outline bg-surface-container-low p-4"
            >
              {description.trim() ? (
                <KanbanCardDescriptionContent
                  description={description}
                  bodyTestId="kanban-card-form-preview-body"
                  doneConditionTestId="kanban-card-form-preview-done-condition"
                />
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label htmlFor="kanban-card-status" className="block mb-2">
              Column
            </Label>
            <Select
              id="kanban-card-status"
              data-testid="kanban-card-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as KanbanStatus)}
            >
              {KANBAN_COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="kanban-card-priority" className="block mb-2">
              Priority
            </Label>
            <Select
              id="kanban-card-priority"
              data-testid="kanban-card-priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as KanbanPriority)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="kanban-card-assignee" className="block mb-2">
              Assignee
            </Label>
            <Select
              id="kanban-card-assignee"
              data-testid="kanban-card-assignee-select"
              value={assignee}
              onChange={(e) =>
                setAssignee(e.target.value as '' | 'human' | 'claude_code')
              }
            >
              <option value="">Unassigned</option>
              <option value="human">Human</option>
              <option value="claude_code">Claude Code</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="kanban-card-type" className="block mb-2">
              Type
            </Label>
            <Select
              id="kanban-card-type"
              data-testid="kanban-card-type-select"
              value={type}
              onChange={(e) => setType(e.target.value as KanbanType)}
            >
              {KANBAN_TYPES.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="neutral"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            data-testid="kanban-card-form-submit"
            className="flex-1"
            disabled={saving || !title.trim()}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Card'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
