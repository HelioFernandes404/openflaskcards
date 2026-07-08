import { useMemo, useState } from 'react'
import {
  Search,
  Clock,
  Circle,
  Layers,
  Tag,
  ChevronRight,
  ChevronDown,
  X,
  Bookmark,
  PanelLeftClose,
} from 'lucide-react'
import type { SidebarFilterType } from '../../types/browse'
import type { BrowseFilterSection } from '../../types/browse'
import type { Deck } from '@/features/decks/types/deck'
import { EmptyState } from '@/shared/components/empty-state'
import { Input } from '@/shared/components/input'
import { Skeleton } from '@/shared/components/skeleton'
import { cn } from '@/shared/utils'

const sectionIcons: Record<string, React.ElementType> = {
  today: Clock,
  state: Circle,
  tag: Tag,
}

function formatOptionLabel(label: string, count: number) {
  return count > 0 ? `${label} (${count})` : label
}

function SidebarSection({
  title,
  children,
  defaultExpanded = true,
  forceExpanded = false,
}: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  forceExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isExpanded = forceExpanded || expanded

  return (
    <div className="mb-1">
      <button
        type="button"
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-center px-2 py-1 text-xs font-heading uppercase tracking-wider text-on-surface-variant transition-colors duration-150 hover:text-on-surface"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mr-1 flex w-4 justify-center">
          {isExpanded ? (
            <ChevronDown size={12} aria-hidden="true" />
          ) : (
            <ChevronRight size={12} aria-hidden="true" />
          )}
        </div>
        {title}
      </button>
      {isExpanded && <div>{children}</div>}
    </div>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  testId,
}: {
  icon?: React.ElementType
  label: string
  active?: boolean
  onClick?: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full cursor-pointer items-center border-l-2 px-2 py-1.5 text-sm transition-colors duration-150',
        active
          ? 'border-l-on-surface bg-surface-container font-medium text-on-surface'
          : 'border-l-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
      )}
      onClick={onClick}
    >
      {Icon && <Icon size={14} className="mr-2 shrink-0" strokeWidth={1.5} />}
      <span className="truncate">{label}</span>
    </button>
  )
}

interface BrowseSidebarProps {
  open: boolean
  onClose: () => void
  decks: Deck[]
  totalCards: number
  filterSections: BrowseFilterSection[]
  isLoadingFilters: boolean
  currentFilterType: SidebarFilterType
  currentFilterValue: string | null
  onFilterChange: (type: SidebarFilterType, value: string | null) => void
}

export function BrowseSidebar({
  open,
  onClose,
  decks,
  totalCards,
  filterSections,
  isLoadingFilters,
  currentFilterType,
  currentFilterValue,
  onFilterChange,
}: BrowseSidebarProps) {
  const [sidebarQuery, setSidebarQuery] = useState('')

  const isActive = (type: SidebarFilterType, value: string | null) => {
    return currentFilterType === type && currentFilterValue === value
  }

  const matchesQuery = (label: string) => {
    if (!sidebarQuery.trim()) return true
    return label.toLowerCase().includes(sidebarQuery.trim().toLowerCase())
  }

  const filteredDecks = useMemo(
    () => decks.filter((deck) => matchesQuery(deck.name)),
    [decks, sidebarQuery],
  )

  const visibleSections = useMemo(
    () =>
      filterSections
        .map((section) => ({
          ...section,
          options: section.options.filter((item) => matchesQuery(item.label)),
        }))
        .filter((section) => section.options.length > 0),
    [filterSections, sidebarQuery],
  )

  const hasSidebarQuery = sidebarQuery.trim().length > 0
  const showAllCards = matchesQuery('All Cards')
  const hasVisibleItems =
    showAllCards ||
    visibleSections.length > 0 ||
    filteredDecks.length > 0 ||
    (!hasSidebarQuery && decks.length === 0)

  return (
    <aside
      id="browse-sidebar"
      data-testid="browse-sidebar"
      aria-label="Browse filters"
      aria-hidden={!open}
      className={cn(
        'hidden lg:flex h-full shrink-0 flex-col overflow-hidden border-r border-outline-subtle bg-surface-container-lowest transition-[width,border-color] duration-250 ease-out',
        open ? 'w-56' : 'pointer-events-none w-0 border-r-transparent',
      )}
    >
      <div
        className={cn(
          'flex w-56 shrink-0 flex-col border-b border-outline-subtle px-3 py-3',
          !open && 'invisible',
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-on-surface-variant">
            Filters
          </p>
          <button
            type="button"
            data-testid="browse-filters-close"
            aria-label="Close filters"
            onClick={onClose}
            className="cursor-pointer rounded-base p-1.5 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container hover:text-on-surface"
          >
            <PanelLeftClose size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="relative">
          <label htmlFor="browse-sidebar-search" className="sr-only">
            Filter sidebar
          </label>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={14}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Input
            id="browse-sidebar-search"
            type="search"
            value={sidebarQuery}
            onChange={(e) => setSidebarQuery(e.target.value)}
            placeholder="Filter sidebar…"
            className="h-9 py-2 pl-8 pr-8"
          />
          {sidebarQuery && (
            <button
              type="button"
              aria-label="Clear sidebar filter"
              onClick={() => setSidebarQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-base p-1 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container hover:text-on-surface"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn('w-56 flex-1 overflow-y-auto py-2', !open && 'invisible')}
      >
        {isLoadingFilters ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : hasSidebarQuery && !hasVisibleItems ? (
          <div className="px-2">
            <EmptyState
              title="No matching filters"
              hint={`Nothing in the sidebar matches "${sidebarQuery.trim()}".`}
              className="py-8"
            />
          </div>
        ) : (
          <>
            {showAllCards && (
              <SidebarItem
                label={`All Cards${totalCards > 0 ? ` (${totalCards})` : ''}`}
                icon={Layers}
                active={isActive('all', null)}
                onClick={() => onFilterChange('all', null)}
                testId="browse-filter-all"
              />
            )}

            <SidebarSection title="Saved Searches" defaultExpanded={false}>
              <div className="px-2 py-2">
                <div className="rounded-lg border border-dashed border-outline bg-surface-container-lowest px-3 py-4 text-center">
                  <Bookmark
                    size={16}
                    className="mx-auto mb-2 text-on-surface-variant"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <p className="text-xs text-on-surface-variant">
                    No saved searches yet
                  </p>
                </div>
              </div>
            </SidebarSection>

            {visibleSections.map((section) => (
              <SidebarSection
                key={section.id}
                title={section.title}
                forceExpanded={hasSidebarQuery}
              >
                {section.options.map((item) => (
                  <SidebarItem
                    key={`${item.type}-${item.value}`}
                    label={formatOptionLabel(item.label, item.count)}
                    icon={sectionIcons[section.id]}
                    active={isActive(item.type, item.value)}
                    onClick={() => onFilterChange(item.type, item.value)}
                  />
                ))}
              </SidebarSection>
            ))}

            {(filteredDecks.length > 0 || !hasSidebarQuery) && (
              <SidebarSection title="Decks" forceExpanded={hasSidebarQuery}>
                {filteredDecks.length === 0 ? (
                  <div className="px-2 py-2">
                    <p className="px-2 text-xs text-on-surface-variant">
                      No decks yet. Create one from the dashboard.
                    </p>
                  </div>
                ) : (
                  filteredDecks.map((deck) => (
                    <SidebarItem
                      key={deck.id}
                      label={deck.name}
                      icon={Layers}
                      active={isActive('deck', deck.id)}
                      onClick={() => onFilterChange('deck', deck.id)}
                      testId={`browse-filter-deck-${deck.id}`}
                    />
                  ))
                )}
              </SidebarSection>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
