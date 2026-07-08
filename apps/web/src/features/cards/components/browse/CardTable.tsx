import { useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Layers,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Badge } from '@/shared/components/badge'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { Input } from '@/shared/components/input'
import { Skeleton } from '@/shared/components/skeleton'
import { cn } from '@/shared/utils'
import {
  type BrowseTableColumn,
  useBrowseTableColumnWidths,
} from '../../hooks/useBrowseTableColumnWidths'
import type { SortColumn } from '../../types/browse'
import type { Card } from '../../types/card'
import { CardTableRow } from './CardTableRow'

const ROW_HEIGHT = 44
const ROW_OVERSCAN = 10

interface CardTableProps {
  cards: Card[]
  totalCards: number
  selectedCardId: string | null
  onSelectCard: (id: string) => void
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  onToggleSort: (column: SortColumn) => void
  getDeckName: (deckId: string) => string
  getCardStateLabel: (state: Card['state']) => string
  isLoading: boolean
  searchInput: string
  onSearchInputChange: (query: string) => void
  hasActiveFilters: boolean
  activeFilterLabel: string
  onClearFilters: () => void
  filtersOpen: boolean
  onToggleFilters: () => void
  onTtsEnabledChange: (cardId: string, enabled: boolean) => void
}

function ColumnResizeHandle({
  column,
  onResizeStart,
  onAutoFit,
}: {
  column: BrowseTableColumn
  onResizeStart: (column: BrowseTableColumn, clientX: number) => void
  onAutoFit: (column: BrowseTableColumn) => void
}) {
  return (
    <button
      type="button"
      aria-label={`Resize ${column} column. Double-click to auto-fit.`}
      data-testid={`browse-column-resize-${column}`}
      className="absolute right-0 top-0 z-10 h-full w-2 translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent p-0 after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-outline hover:after:bg-on-surface-variant"
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onResizeStart(column, event.clientX)
      }}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onAutoFit(column)
      }}
      onClick={(event) => event.stopPropagation()}
    />
  )
}

function SortHeaderButton({
  column,
  label,
  className,
  sortColumn,
  sortDirection,
  onToggleSort,
  onResizeStart,
  onAutoFit,
}: {
  column: SortColumn
  label: string
  className?: string
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  onToggleSort: (column: SortColumn) => void
  onResizeStart: (column: BrowseTableColumn, clientX: number) => void
  onAutoFit: (column: BrowseTableColumn) => void
}) {
  const isActive = sortColumn === column
  const ariaSort = isActive
    ? sortDirection === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'

  return (
    <div
      className={cn('relative min-w-0', className)}
      role="columnheader"
      data-column={column}
      data-column-role="header"
    >
      <button
        type="button"
        aria-sort={ariaSort}
        className={cn(
          'flex h-full w-full items-center border-r-2 border-outline px-3 py-2 text-left transition-colors duration-150 hover:bg-surface cursor-pointer',
          isActive && 'bg-surface text-on-surface',
        )}
        onClick={() => onToggleSort(column)}
      >
        <span className="truncate">{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp size={12} className="ml-2 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowDown size={12} className="ml-2 shrink-0" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown
            size={12}
            className="ml-2 shrink-0 opacity-40"
            aria-hidden="true"
          />
        )}
      </button>
      <ColumnResizeHandle
        column={column}
        onResizeStart={onResizeStart}
        onAutoFit={onAutoFit}
      />
    </div>
  )
}

function StaticHeaderCell({
  column,
  label,
  className,
  onResizeStart,
  onAutoFit,
}: {
  column: BrowseTableColumn
  label: string
  className?: string
  onResizeStart: (column: BrowseTableColumn, clientX: number) => void
  onAutoFit: (column: BrowseTableColumn) => void
}) {
  return (
    <div
      className={cn('relative min-w-0', className)}
      role="columnheader"
      data-column={column}
      data-column-role="header"
    >
      <div className="flex h-full w-full items-center border-r-2 border-outline px-3 py-2 text-left text-on-surface-variant">
        <span className="truncate">{label}</span>
      </div>
      <ColumnResizeHandle
        column={column}
        onResizeStart={onResizeStart}
        onAutoFit={onAutoFit}
      />
    </div>
  )
}

export function CardTable({
  cards,
  totalCards,
  selectedCardId,
  onSelectCard,
  sortColumn,
  sortDirection,
  onToggleSort,
  getDeckName,
  getCardStateLabel,
  isLoading,
  searchInput,
  onSearchInputChange,
  hasActiveFilters,
  activeFilterLabel,
  onClearFilters,
  filtersOpen,
  onToggleFilters,
  onTtsEnabledChange,
}: CardTableProps) {
  const { gridTemplateColumns, tableBodyRef, startResize, autoFitColumn } =
    useBrowseTableColumnWidths()

  const handleAutoFit = useCallback(
    (column: BrowseTableColumn) => {
      autoFitColumn(column, { visibleOnly: cards.length > 0 })
    },
    [autoFitColumn, cards.length],
  )

  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => tableBodyRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  })

  useEffect(() => {
    if (!selectedCardId || isLoading || cards.length === 0) return

    const index = cards.findIndex((card) => card.id === selectedCardId)
    if (index >= 0) {
      rowVirtualizer.scrollToIndex(index, { align: 'auto' })
    }
    // rowVirtualizer is intentionally omitted — scrollToIndex is stable enough per selection change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, isLoading, cards])

  const resultLabel = cards.length === 1 ? '1 card' : `${cards.length} cards`

  const renderEmptyState = () => {
    if (totalCards === 0) {
      return (
        <div className="m-4 rounded-xl border border-dashed border-outline bg-surface-container-lowest">
          <EmptyState
            title="No cards yet"
            hint="Create a deck and add cards from the dashboard to start browsing."
          />
        </div>
      )
    }

    if (hasActiveFilters) {
      return (
        <div className="m-4 rounded-xl border border-dashed border-outline bg-surface-container-lowest">
          <EmptyState
            title="No cards match your filters"
            hint={
              searchInput.trim()
                ? `Nothing found for "${activeFilterLabel}" matching "${searchInput.trim()}".`
                : `Nothing found for "${activeFilterLabel}". Try another filter or clear your search.`
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="cursor-pointer"
              >
                <SearchX size={14} strokeWidth={1.5} />
                Clear filters
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <EmptyState
        title="No cards to show"
        hint="Adjust your sidebar filters to see cards here."
      />
    )
  }

  return (
    <div
      data-testid="browse-card-table"
      className="flex h-full min-w-0 flex-1 flex-col bg-surface"
    >
      <div className="border-b-2 border-outline bg-surface-container-low">
        <div className="flex h-12 items-center gap-3 px-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="browse-filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="browse-sidebar"
            onClick={onToggleFilters}
            className={cn(
              'hidden shrink-0 cursor-pointer lg:inline-flex',
              filtersOpen && 'bg-surface-container-high text-on-surface',
            )}
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} />
            Filters
            {hasActiveFilters && !filtersOpen && (
              <span
                className="size-1.5 rounded-full bg-on-surface"
                aria-hidden="true"
              />
            )}
          </Button>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-outline bg-surface-container px-3 py-1 text-xs font-bold text-on-surface">
              <Layers size={12} strokeWidth={1.5} aria-hidden="true" />
              <span>Cards</span>
            </div>
            {!isLoading && (
              <span className="rounded-full border border-primary-500/20 bg-surface-container px-2 py-0.5 font-mono text-2xs text-on-surface-variant">
                {hasActiveFilters
                  ? `${cards.length} / ${totalCards}`
                  : totalCards}
              </span>
            )}
          </div>

          <div className="relative min-w-0 flex-1">
            <label htmlFor="browse-cards-search" className="sr-only">
              Search cards
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              size={14}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <Input
              id="browse-cards-search"
              type="search"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Search front or back text…"
              className="h-9 w-full py-2 pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchInputChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-base p-1 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && !isLoading && (
          <div className="flex items-center gap-2 border-t border-outline px-3 py-2">
            <span className="text-2xs font-mono uppercase tracking-[0.06em] text-on-surface-variant">
              Filtered by
            </span>
            <Badge variant="outlined">{activeFilterLabel}</Badge>
            {searchInput.trim() && (
              <Badge variant="neutral">"{searchInput.trim()}"</Badge>
            )}
            <span className="ml-auto text-xs text-on-surface-variant">
              {resultLabel}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 shrink-0 cursor-pointer text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="overflow-x-auto border-b-2 border-outline bg-surface-container-low"
          role="rowgroup"
        >
          <div
            className="grid min-w-[720px] select-none text-xs font-heading uppercase"
            role="row"
            style={{ gridTemplateColumns }}
          >
            <SortHeaderButton
              column="front"
              label="Word"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
              onResizeStart={startResize}
              onAutoFit={handleAutoFit}
            />
            <StaticHeaderCell
              column="tts"
              label="TTS"
              onResizeStart={startResize}
              onAutoFit={handleAutoFit}
            />
            <SortHeaderButton
              column="state"
              label="Status"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
              onResizeStart={startResize}
              onAutoFit={handleAutoFit}
            />
            <SortHeaderButton
              column="deck"
              label="Deck"
              className="[&_button]:border-r-0"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
              onResizeStart={startResize}
              onAutoFit={handleAutoFit}
            />
          </div>
        </div>

        <div
          ref={tableBodyRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-auto"
          aria-busy={isLoading}
          aria-live="polite"
        >
          {isLoading ? (
            <div className="min-w-[720px] divide-y divide-outline-variant">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="grid w-full animate-pulse text-sm"
                  style={{ gridTemplateColumns }}
                  aria-hidden="true"
                >
                  <div className="border-r border-outline px-3 py-2.5">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="border-r border-outline px-3 py-2.5">
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="border-r border-outline px-3 py-2.5">
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="border-r border-outline px-3 py-2.5">
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="px-3 py-2.5">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : cards.length === 0 ? (
            renderEmptyState()
          ) : (
            <div
              className="relative min-w-[720px]"
              role="rowgroup"
              aria-rowcount={cards.length}
            >
              <div
                className="relative w-full"
                style={{ height: rowVirtualizer.getTotalSize() }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const card = cards[virtualRow.index]
                  if (!card) return null

                  return (
                    <div
                      key={card.id}
                      className="absolute left-0 top-0 w-full"
                      style={{
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <CardTableRow
                        card={card}
                        isSelected={selectedCardId === card.id}
                        rowIndex={virtualRow.index}
                        gridTemplateColumns={gridTemplateColumns}
                        deckName={getDeckName(card.deckId)}
                        stateLabel={getCardStateLabel(card.state)}
                        onSelectCard={onSelectCard}
                        onTtsEnabledChange={onTtsEnabledChange}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
