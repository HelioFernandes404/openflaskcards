import { useMemo, useState } from 'react'
import { CircleHelp, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { SkeletonCard } from '@/shared/components/skeleton'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { useKanban } from '../hooks/useKanban'
import { KanbanCardItem } from '../components/KanbanCardItem'
import { KanbanCardFormModal } from '../components/KanbanCardFormModal'
import { KanbanCardDetailModal } from '../components/KanbanCardDetailModal'
import {
  KANBAN_COLUMNS,
  type KanbanCard,
  type KanbanStatus,
} from '../types/kanbanCard'

const COLUMN_INDEX: Record<KanbanStatus, number> = Object.fromEntries(
  KANBAN_COLUMNS.map((column, index) => [column.status, index]),
) as Record<KanbanStatus, number>

export function KanbanBoard() {
  const {
    cards,
    loading,
    createKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
  } = useKanban()
  const [formState, setFormState] = useState<{
    open: boolean
    card: KanbanCard | null
    initialStatus: KanbanStatus
  }>({
    open: false,
    card: null,
    initialStatus: 'backlog',
  })
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [detailCard, setDetailCard] = useState<KanbanCard | null>(null)

  const cardsByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, KanbanCard[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    }
    for (const card of cards) {
      grouped[card.status].push(card)
    }
    for (const status of Object.keys(grouped) as KanbanStatus[]) {
      grouped[status].sort((a, b) => a.position - b.position)
    }
    return grouped
  }, [cards])

  const openCreate = (status: KanbanStatus) =>
    setFormState({ open: true, card: null, initialStatus: status })
  const openEdit = (card: KanbanCard) => {
    setDetailCard(null)
    setFormState({ open: true, card, initialStatus: card.status })
  }
  const closeForm = () => setFormState((prev) => ({ ...prev, open: false }))

  const handleConfirmDelete = () => {
    if (pendingDeleteId) deleteKanbanCard(pendingDeleteId)
    setPendingDeleteId(null)
    setDetailCard(null)
  }

  const detailColumnIndex = detailCard ? COLUMN_INDEX[detailCard.status] : null

  const moveCard = (id: string, direction: -1 | 1) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    const target = KANBAN_COLUMNS[COLUMN_INDEX[card.status] + direction]
    if (!target) return
    updateKanbanCard(id, { status: target.status })
  }

  return (
    <div
      className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="kanban-board-page"
    >
      <PageHeader
        title="Kanban"
        subtitle="Loop Engineering — external memory for maker/judge agent cycles"
        backTo="/"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2"
              asChild
              data-testid="kanban-loop-help-link"
            >
              <Link to="/kanban/help">
                <CircleHelp size={16} /> How it works
              </Link>
            </Button>
            <Button
              data-testid="new-kanban-card-button"
              className="gap-2"
              onClick={() => openCreate('backlog')}
            >
              <Plus size={16} /> New Card
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(({ status, label }, columnIndex) => {
            const columnCards = cardsByStatus[status]
            const canMoveBack = columnIndex > 0
            const canMoveForward = columnIndex < KANBAN_COLUMNS.length - 1
            return (
              <div
                key={status}
                className="flex flex-col gap-3 w-[280px] shrink-0 sm:w-auto sm:flex-1 sm:min-w-[240px]"
                data-testid={`kanban-column-${status}`}
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-on-surface font-mono uppercase tracking-wide">
                    {label}
                  </h2>
                  <span className="text-xs text-on-surface-variant font-mono">
                    {columnCards.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnCards.length === 0 ? (
                    <EmptyState title="No cards" hint="Nothing here yet." />
                  ) : (
                    columnCards.map((card) => (
                      <KanbanCardItem
                        key={card.id}
                        card={card}
                        canMoveBack={canMoveBack}
                        canMoveForward={canMoveForward}
                        onMoveBack={(id) => moveCard(id, -1)}
                        onMoveForward={(id) => moveCard(id, 1)}
                        onOpen={setDetailCard}
                        onEdit={openEdit}
                        onDelete={(id) => setPendingDeleteId(id)}
                      />
                    ))
                  )}
                </div>

                <button
                  type="button"
                  data-testid={`kanban-column-add-${status}`}
                  onClick={() => openCreate(status)}
                  className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-md hover:bg-surface-container-high cursor-pointer"
                >
                  <Plus size={14} strokeWidth={1.5} /> Add card
                </button>
              </div>
            )
          })}
        </div>
      )}

      <KanbanCardFormModal
        isOpen={formState.open}
        card={formState.card}
        initialStatus={formState.initialStatus}
        onClose={closeForm}
        onCreate={createKanbanCard}
        onUpdate={updateKanbanCard}
      />

      {detailCard && (
        <KanbanCardDetailModal
          card={detailCard}
          isOpen
          canMoveBack={detailColumnIndex !== null && detailColumnIndex > 0}
          canMoveForward={
            detailColumnIndex !== null &&
            detailColumnIndex < KANBAN_COLUMNS.length - 1
          }
          onClose={() => setDetailCard(null)}
          onEdit={openEdit}
          onDelete={(id) => setPendingDeleteId(id)}
          onMoveBack={(id) => {
            moveCard(id, -1)
            const card = cards.find((c) => c.id === id)
            if (card) {
              const newStatus =
                KANBAN_COLUMNS[COLUMN_INDEX[card.status] - 1]?.status
              if (newStatus) setDetailCard({ ...card, status: newStatus })
            }
          }}
          onMoveForward={(id) => {
            moveCard(id, 1)
            const card = cards.find((c) => c.id === id)
            if (card) {
              const newStatus =
                KANBAN_COLUMNS[COLUMN_INDEX[card.status] + 1]?.status
              if (newStatus) setDetailCard({ ...card, status: newStatus })
            }
          }}
        />
      )}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete card"
        message="This kanban card will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
