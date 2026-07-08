import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useBrowseCardsViewModel } from '../hooks/useBrowseCardsViewModel'
import { BrowseSidebar } from '../components/browse/BrowseSidebar'
import { CardTable } from '../components/browse/CardTable'
import { CardEditor } from '../components/browse/CardEditor'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

export function BrowseCards() {
  const vm = useBrowseCardsViewModel()
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    document.title = 'Browse Cards — Flashcards'
    return () => {
      document.title = 'Flashcards'
    }
  }, [])

  return (
    <div
      className="flex flex-1 min-h-0 w-full bg-surface text-on-surface overflow-hidden"
      data-testid="browse-cards-page"
    >
      <BrowseSidebar
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        decks={vm.decks}
        totalCards={vm.browseFilters?.totalCards ?? vm.cards.length}
        filterSections={vm.browseFilters?.sections ?? []}
        isLoadingFilters={vm.isLoadingFilters}
        currentFilterType={vm.filters.sidebarType}
        currentFilterValue={vm.filters.sidebarValue}
        onFilterChange={vm.setSidebarFilter}
      />

      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        {vm.error && (
          <div
            className="mx-4 mt-4 bg-danger-50 border border-danger-200 p-4 rounded-md flex items-start gap-3 shrink-0"
            data-testid="browse-error-alert"
          >
            <AlertCircle
              className="text-danger-800 shrink-0 mt-0.5"
              size={18}
              strokeWidth={1.5}
            />
            <p className="text-sm font-base text-danger-800">{vm.error}</p>
          </div>
        )}

        <CardTable
          cards={vm.filteredCards}
          totalCards={vm.cards.length}
          selectedCardId={vm.selectedCardId}
          onSelectCard={vm.setSelectedCardId}
          sortColumn={vm.filters.sortColumn}
          sortDirection={vm.filters.sortDirection}
          onToggleSort={vm.toggleSort}
          getDeckName={vm.getDeckName}
          getCardStateLabel={vm.getCardStateLabel}
          isLoading={vm.isLoadingCards}
          searchInput={vm.searchInput}
          onSearchInputChange={vm.setSearchInput}
          hasActiveFilters={vm.hasActiveFilters}
          activeFilterLabel={vm.activeFilterLabel}
          onClearFilters={vm.clearFilters}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((open) => !open)}
          onTtsEnabledChange={vm.setTtsEnabledForCard}
        />
      </div>

      <div className="shrink-0 min-h-0">
        <CardEditor
          card={vm.selectedCard}
          frontText={vm.editor.frontText}
          backText={vm.editor.backText}
          imagemUrl={vm.editor.imagemUrl}
          cardTags={vm.editor.cardTags}
          isDirty={vm.editor.isDirty}
          isSaving={vm.editor.isSaving}
          saveError={vm.editor.saveError}
          lastSavedAt={vm.editor.lastSavedAt}
          getDeckName={vm.getDeckName}
          getCardStateLabel={vm.getCardStateLabel}
          onFrontTextChange={vm.setFrontText}
          onBackTextChange={vm.setBackText}
          onImagemUrlChange={vm.setImagemUrl}
          onCardTagsChange={vm.setCardTags}
          ttsEnabled={vm.editor.ttsEnabled}
          onTtsEnabledChange={vm.setTtsEnabled}
          onDeleteRequest={vm.requestDeleteCard}
          isDeleting={vm.isDeletingCard}
          onQuickCreate={vm.quickCreateCard}
          canQuickCreate={vm.canQuickCreate}
          isCreating={vm.isCreatingCard}
        />
      </div>

      <ConfirmDialog
        isOpen={!!vm.cardPendingDelete}
        onClose={vm.cancelDeleteCard}
        onConfirm={vm.deleteCard}
        title="Delete card"
        message={
          vm.cardPendingDelete
            ? `Delete "${vm.cardPendingDelete.front}"? This cannot be undone and its review progress will be lost.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={vm.isDeletingCard}
      />
    </div>
  )
}
