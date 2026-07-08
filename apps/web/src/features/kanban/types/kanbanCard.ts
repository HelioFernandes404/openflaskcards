export type KanbanStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type KanbanPriority = 'low' | 'medium' | 'high'
export type KanbanAssignee = 'human' | 'claude_code'
export type KanbanType = 'bug' | 'feature' | 'tech_debt' | 'chore'

// Canonical type order + labels — the single source of truth for the
// create/edit form's type select and any badge rendering.
export const KANBAN_TYPES: ReadonlyArray<{ type: KanbanType; label: string }> =
  [
    { type: 'bug', label: 'Bug' },
    { type: 'feature', label: 'Feature' },
    { type: 'tech_debt', label: 'Tech Debt' },
    { type: 'chore', label: 'Chore' },
  ]

// Canonical column order + labels — the single source of truth for board
// rendering, the create/edit form's column select, and any in-memory
// grouping/sorting. Import this instead of re-listing the four statuses.
export const KANBAN_COLUMNS: ReadonlyArray<{
  status: KanbanStatus
  label: string
}> = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

export interface KanbanCard {
  id: string
  userId: string
  title: string
  description: string
  status: KanbanStatus
  priority: KanbanPriority
  assignee: KanbanAssignee | null
  position: number
  type: KanbanType
  verificationNote: string
  createdAt: string
  updatedAt: string
}

export interface KanbanCardCreateInput {
  title: string
  description?: string
  status?: KanbanStatus
  priority?: KanbanPriority
  assignee?: KanbanAssignee
  type?: KanbanType
}

export interface KanbanCardUpdateInput {
  title?: string
  description?: string
  status?: KanbanStatus
  priority?: KanbanPriority
  assignee?: KanbanAssignee
  type?: KanbanType
  verificationNote?: string
}
