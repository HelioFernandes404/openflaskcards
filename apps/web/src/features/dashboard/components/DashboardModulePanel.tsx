import { Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/components/button'
import { DeckTable } from '@/features/decks/components/DeckTable'
import { getSectionDueCount } from '@/features/decks/utils/deckCounts'
import type { DeckModuleSection } from '@/features/modules/domain/groupDecksByModule'
import type { Module } from '@/features/modules/types/module'

export interface DashboardModulePanelProps {
  section: DeckModuleSection | null
  module: Module | null
  loading: boolean
  onCreateDeck: () => void
  onStartStudy: (deckId: string) => void
  onAddCards: (deckId: string) => void
  onEditDeck: (id: string) => void
  onDeleteDeck: (id: string) => void
  onEditModule?: (module: Module) => void
  onDeleteModule?: (module: Module) => void
  pinnedDeckIds?: Set<string>
  onTogglePin?: (id: string) => void
}

export function DashboardModulePanel({
  section,
  module,
  loading,
  onCreateDeck,
  onStartStudy,
  onAddCards,
  onEditDeck,
  onDeleteDeck,
  onEditModule,
  onDeleteModule,
  pinnedDeckIds,
  onTogglePin,
}: DashboardModulePanelProps) {
  if (!section) {
    return (
      <div
        className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center"
        data-testid="dashboard-module-panel-empty"
      >
        <p className="text-sm text-on-surface-variant">
          No modules or decks match your search.
        </p>
      </div>
    )
  }

  const dueCount = getSectionDueCount(section.decks)
  const groupId = section.id ?? 'unassigned'

  return (
    <div
      className="min-w-0"
      data-testid={
        section.id
          ? `module-deck-group-${section.id}`
          : 'module-deck-group-unassigned'
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-on-surface truncate">
            {section.title}
          </h3>
          <p className="mt-0.5 font-mono text-2xs text-on-surface-variant tabular-nums">
            {section.decks.length} deck{section.decks.length === 1 ? '' : 's'}
            {dueCount > 0 ? ` · ${dueCount} due` : ''}
          </p>
        </div>

        {module && (onEditModule || onDeleteModule) ? (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
              data-testid={`prompt-help-module-${module.id}`}
            >
              <Link to="/helps/prompt" search={{ module: module.id }}>
                <Sparkles size={14} />
                Prompt
              </Link>
            </Button>
            {onEditModule ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditModule(module)}
                data-testid={`edit-module-${module.id}`}
              >
                <Pencil size={14} />
                Edit
              </Button>
            ) : null}
            {onDeleteModule ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDeleteModule(module)}
                data-testid={`delete-module-${module.id}`}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div id={`module-deck-group-content-${groupId}`}>
        <DeckTable
          decks={section.decks}
          loading={loading}
          onCreateDeck={onCreateDeck}
          onStart={onStartStudy}
          onAddCards={onAddCards}
          onEdit={onEditDeck}
          onDelete={onDeleteDeck}
          pinnedDeckIds={pinnedDeckIds}
          onTogglePin={onTogglePin}
          emptyTitle="No decks in this section"
          emptyHint={
            section.id
              ? 'Create a deck and assign it to this module'
              : 'Decks without a module appear here'
          }
        />
      </div>
    </div>
  )
}
