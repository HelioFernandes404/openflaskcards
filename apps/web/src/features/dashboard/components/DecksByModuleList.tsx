import { useEffect, useMemo, useState } from 'react'
import {
  DashboardModuleNav,
  sectionNavKey,
} from '@/features/dashboard/components/DashboardModuleNav'
import { DashboardModulePanel } from '@/features/dashboard/components/DashboardModulePanel'
import type { DeckModuleSection } from '@/features/modules/domain/groupDecksByModule'
import type { Module } from '@/features/modules/types/module'

export interface DecksByModuleListProps {
  /** Total deck count after search filtering, shown in the section badge. */
  deckCount: number
  sections: DeckModuleSection[]
  modules: Module[]
  moduleById: Map<string, Module>
  assigningDeckId: string | null
  loading: boolean
  onCreateDeck: () => void
  onStartStudy: (deckId: string) => void
  onAddCards: (deckId: string) => void
  onAssignModule: (deckId: string, moduleId: string | null) => void
  onEditDeck: (id: string) => void
  onDeleteDeck: (id: string) => void
  onEditModule: (module: Module) => void
  onDeleteModule: (module: Module) => void
  pinnedDeckIds: Set<string>
  onTogglePin: (id: string) => void
}

function pickDefaultSectionKey(sections: DeckModuleSection[]): string | null {
  if (sections.length === 0) return null
  const withDecks = sections.find((section) => section.decks.length > 0)
  return sectionNavKey(withDecks ?? sections[0])
}

/**
 * Dashboard decks area: module sidebar + deck panel for the selected module.
 */
export function DecksByModuleList({
  deckCount,
  sections,
  modules: _modules,
  moduleById,
  assigningDeckId: _assigningDeckId,
  loading,
  onCreateDeck,
  onStartStudy,
  onAddCards,
  onAssignModule: _onAssignModule,
  onEditDeck,
  onDeleteDeck,
  onEditModule,
  onDeleteModule,
  pinnedDeckIds,
  onTogglePin,
}: DecksByModuleListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(() =>
    pickDefaultSectionKey(sections),
  )

  const sectionKeys = useMemo(
    () => sections.map((section) => sectionNavKey(section)),
    [sections],
  )

  useEffect(() => {
    if (sectionKeys.length === 0) {
      setSelectedKey(null)
      return
    }
    if (selectedKey === null || !sectionKeys.includes(selectedKey)) {
      setSelectedKey(pickDefaultSectionKey(sections))
    }
  }, [sectionKeys, sections, selectedKey])

  const selectedSection =
    sections.find((section) => sectionNavKey(section) === selectedKey) ?? null
  const selectedModule = selectedSection?.id
    ? (moduleById.get(selectedSection.id) ?? null)
    : null

  return (
    <section className="space-y-4" data-testid="dashboard-decks-list">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="font-display text-base font-semibold text-on-surface">
          Decks by module
        </h2>
        <span className="font-mono text-2xs text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded-full tabular-nums">
          {deckCount}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(140px,200px)_1fr] md:items-start">
        <DashboardModuleNav
          sections={sections}
          selectedKey={selectedKey ?? ''}
          onSelect={setSelectedKey}
          loading={loading}
        />

        <DashboardModulePanel
          section={selectedSection}
          module={selectedModule}
          loading={loading}
          onCreateDeck={onCreateDeck}
          onStartStudy={onStartStudy}
          onAddCards={onAddCards}
          onEditDeck={onEditDeck}
          onDeleteDeck={onDeleteDeck}
          onEditModule={onEditModule}
          onDeleteModule={onDeleteModule}
          pinnedDeckIds={pinnedDeckIds}
          onTogglePin={onTogglePin}
        />
      </div>
    </section>
  )
}
