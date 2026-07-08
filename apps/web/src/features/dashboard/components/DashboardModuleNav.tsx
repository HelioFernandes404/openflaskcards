import { cn } from '@/shared/utils'
import { getSectionDueCount } from '@/features/decks/utils/deckCounts'
import type { DeckModuleSection } from '@/features/modules/domain/groupDecksByModule'

export interface DashboardModuleNavProps {
  sections: DeckModuleSection[]
  selectedKey: string
  onSelect: (key: string) => void
  loading?: boolean
}

export function sectionNavKey(section: DeckModuleSection): string {
  return section.id ?? 'unassigned'
}

function ModuleNavButton({
  section,
  selected,
  onSelect,
  layout,
}: {
  section: DeckModuleSection
  selected: boolean
  onSelect: () => void
  layout: 'sidebar' | 'chip'
}) {
  const key = sectionNavKey(section)
  const dueCount = getSectionDueCount(section.decks)

  if (layout === 'chip') {
    return (
      <button
        type="button"
        data-testid={`dashboard-module-nav-${key}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className={cn(
          'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
          selected
            ? 'border-outline-strong bg-surface-container font-medium text-on-surface'
            : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface',
        )}
      >
        <span>{section.title}</span>
        {dueCount > 0 ? (
          <span className="ml-1.5 font-mono text-2xs tabular-nums text-on-surface">
            {dueCount}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <button
      type="button"
      data-testid={`dashboard-module-nav-${key}`}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
        selected
          ? 'border border-outline-strong bg-surface-container font-medium text-on-surface'
          : 'border border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
      )}
    >
      <span className="truncate">{section.title}</span>
      <span
        className={cn(
          'shrink-0 font-mono text-2xs tabular-nums',
          dueCount > 0 ? 'text-on-surface' : 'text-muted',
        )}
      >
        {dueCount > 0 ? dueCount : section.decks.length}
      </span>
    </button>
  )
}

function NavSkeleton({ layout }: { layout: 'sidebar' | 'chip' }) {
  if (layout === 'chip') {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-surface-container-high"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded-md bg-surface-container-high"
        />
      ))}
    </div>
  )
}

/**
 * Module picker for the dashboard sidebar layout — vertical list on md+,
 * horizontal chips on small screens.
 */
export function DashboardModuleNav({
  sections,
  selectedKey,
  onSelect,
  loading,
}: DashboardModuleNavProps) {
  if (loading && sections.length === 0) {
    return (
      <>
        <div className="md:hidden">
          <NavSkeleton layout="chip" />
        </div>
        <div className="hidden md:block">
          <NavSkeleton layout="sidebar" />
        </div>
      </>
    )
  }

  return (
    <>
      <nav
        className="flex gap-2 overflow-x-auto pb-1 md:hidden"
        aria-label="Modules"
      >
        {sections.map((section) => {
          const key = sectionNavKey(section)
          return (
            <ModuleNavButton
              key={key}
              section={section}
              selected={key === selectedKey}
              onSelect={() => onSelect(key)}
              layout="chip"
            />
          )
        })}
      </nav>

      <nav
        className="hidden md:flex md:flex-col md:gap-0.5"
        aria-label="Modules"
      >
        {sections.map((section) => {
          const key = sectionNavKey(section)
          return (
            <ModuleNavButton
              key={key}
              section={section}
              selected={key === selectedKey}
              onSelect={() => onSelect(key)}
              layout="sidebar"
            />
          )
        })}
      </nav>
    </>
  )
}
