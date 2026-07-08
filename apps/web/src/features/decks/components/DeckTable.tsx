import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { SkeletonTable } from '@/shared/components/skeleton'
import { DeckTableRow } from './DeckTableRow'
import type { Deck } from '@/features/decks/types/deck'
import type { Module } from '@/features/modules/types/module'

interface DeckTableProps {
  decks: Deck[]
  modules?: Module[]
  loading?: boolean
  assigningDeckId?: string | null
  onCreateDeck: () => void
  onStart: (id: string) => void
  onAddCards: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onAssignModule?: (deckId: string, moduleId: string | null) => void
  pinnedDeckIds?: Set<string>
  onTogglePin?: (id: string) => void
  emptyTitle?: string
  emptyHint?: string
}

export function DeckTable({
  decks,
  modules = [],
  loading,
  assigningDeckId = null,
  onCreateDeck,
  onStart,
  onAddCards,
  onEdit,
  onDelete,
  onAssignModule,
  pinnedDeckIds,
  onTogglePin,
  emptyTitle = 'No decks found',
  emptyHint = 'Try adjusting your search or create a new deck',
}: DeckTableProps) {
  if (loading) {
    return (
      <SkeletonTable
        rows={4}
        columns={6}
        className="rounded-xl border-outline-variant"
      />
    )
  }

  if (decks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest">
        <EmptyState
          title={emptyTitle}
          hint={emptyHint}
          action={
            <Button
              onClick={onCreateDeck}
              data-testid="dashboard-create-deck-button"
            >
              <Plus size={16} strokeWidth={1.5} />
              Create deck
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="bg-surface-container-lowest border-b border-outline-variant">
            <tr>
              <th className="px-4 py-3 sm:px-5 text-left font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                Deck
              </th>
              {onAssignModule && modules.length > 0 ? (
                <th className="hidden sm:table-cell px-4 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                  Module
                </th>
              ) : null}
              <th className="hidden md:table-cell px-4 py-3 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                New
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                Lrn
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                Rev
              </th>
              <th className="px-4 py-3 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                Due
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                Last study
              </th>
              <th className="px-4 py-3 sm:px-5 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {decks.map((deck) => (
              <DeckTableRow
                key={deck.id}
                {...deck}
                modules={modules}
                moduleAssignLoading={assigningDeckId === deck.id}
                onAssignModule={onAssignModule}
                onStart={onStart}
                onAddCards={onAddCards}
                onEdit={onEdit}
                onDelete={onDelete}
                isPinned={pinnedDeckIds?.has(deck.id) ?? false}
                onTogglePin={onTogglePin}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
