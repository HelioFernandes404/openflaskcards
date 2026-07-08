import { ChevronDown, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/components/button'
import { DeckTable } from '@/features/decks/components/DeckTable'
import { cn } from '@/shared/utils'
import type { Deck } from '@/features/decks/types/deck'
import type { Module } from '@/features/modules/types/module'

/** Groups with more decks than this start collapsed on the dashboard. */
export const MODULE_DECK_GROUP_COLLAPSE_THRESHOLD = 5

export interface ModuleDeckGroupProps {
  /** Display name for the module (or "No module" for unassigned decks). */
  title: string
  decks: Deck[]
  /** Present when this group maps to a persisted module; null for the unassigned bucket. */
  module?: Module | null
  allModules?: Module[]
  assigningDeckId?: string | null
  loading?: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onCreateDeck: () => void
  onStart: (id: string) => void
  onAddCards: (id: string) => void
  onEditDeck?: (id: string) => void
  onDeleteDeck?: (id: string) => void
  onAssignModule?: (deckId: string, moduleId: string | null) => void
  onEditModule?: (module: Module) => void
  onDeleteModule?: (module: Module) => void
  emptyHint?: string
}

/**
 * Collapsible module group on the dashboard: header toggles the deck table
 * so long lists stay compact until expanded.
 */
export function ModuleDeckGroup({
  title,
  decks,
  module,
  allModules = [],
  assigningDeckId = null,
  loading,
  expanded,
  onExpandedChange,
  onCreateDeck,
  onStart,
  onAddCards,
  onEditDeck,
  onDeleteDeck,
  onAssignModule,
  onEditModule,
  onDeleteModule,
  emptyHint = 'No decks in this module yet',
}: ModuleDeckGroupProps) {
  const groupId = module?.id ?? 'unassigned'
  const contentId = `module-deck-group-content-${groupId}`

  return (
    <section
      className="rounded-lg border border-outline-subtle overflow-hidden"
      data-testid={
        module
          ? `module-deck-group-${module.id}`
          : 'module-deck-group-unassigned'
      }
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-surface-container-low/40">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-surface-container-low"
          onClick={() => onExpandedChange(!expanded)}
          data-testid={`toggle-module-deck-group-${groupId}`}
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn(
              'shrink-0 text-on-surface-variant transition-transform duration-200',
              !expanded && '-rotate-90',
            )}
          />
          <h2 className="font-display text-base font-semibold text-on-surface truncate">
            {title}
          </h2>
          <span className="font-mono text-2xs text-on-surface-variant border border-outline-subtle px-2 py-0.5 rounded-full tabular-nums">
            {decks.length}
          </span>
        </button>

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

      {expanded ? (
        <div id={contentId} className="p-3 pt-0">
          <DeckTable
            decks={decks}
            modules={allModules}
            assigningDeckId={assigningDeckId}
            loading={loading}
            onCreateDeck={onCreateDeck}
            onStart={onStart}
            onAddCards={onAddCards}
            onEdit={onEditDeck}
            onDelete={onDeleteDeck}
            onAssignModule={onAssignModule}
            emptyTitle="No decks in this section"
            emptyHint={emptyHint}
          />
        </div>
      ) : null}
    </section>
  )
}

export function defaultModuleDeckGroupExpanded(deckCount: number): boolean {
  return deckCount <= MODULE_DECK_GROUP_COLLAPSE_THRESHOLD
}

export function buildModuleDeckGroupExpandedState(
  sections: Array<{ id: string | null; decks: Deck[] }>,
): Record<string, boolean> {
  return Object.fromEntries(
    sections.map((section) => [
      section.id ?? 'unassigned',
      defaultModuleDeckGroupExpanded(section.decks.length),
    ]),
  )
}
