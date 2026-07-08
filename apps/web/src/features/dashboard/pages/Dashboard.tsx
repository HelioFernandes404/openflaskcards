import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import {
  getDeckDueToday,
  getDeckTodayCounts,
} from '@/features/decks/utils/deckCounts'
import { Input } from '@/shared/components/input'
import { Button } from '@/shared/components/button'
import { DashboardSummarySection } from '@/features/dashboard/components/DashboardSummarySection'
import { EditDeckModal } from '@/features/decks/components/EditDeckModal'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { PageHeader } from '@/shared/layout/PageHeader'
import { AnimatedPage } from '@/shared/components/motion'
import { DecksByModuleList } from '@/features/dashboard/components/DecksByModuleList'
import { CreateModuleModal } from '@/features/modules/components/CreateModuleModal'
import { EditModuleModal } from '@/features/modules/components/EditModuleModal'
import { groupDecksByModule } from '@/features/modules/domain/groupDecksByModule'
import { usePinnedDecks } from '@/features/decks/hooks/usePinnedDecks'
import { sortDecksPinnedFirst } from '@/features/decks/utils/deckSort'
import type { Deck } from '@/features/decks/types/deck'
import type { Module } from '@/features/modules/types/module'

export function Dashboard() {
  const navigate = useNavigate()
  const {
    decks,
    modules,
    loading,
    handleUpdateDeck,
    handleDeleteDeck,
    handleCreateModule,
    handleUpdateModule,
    handleDeleteModule,
    getDueCardsSummary,
  } = useStudyData()
  const { showToast } = useNotification()
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null)
  const [creatingModule, setCreatingModule] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [deletingModule, setDeletingModule] = useState<Module | null>(null)
  const [assigningDeckId, setAssigningDeckId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { pinnedDeckIds, togglePin } = usePinnedDecks()

  const deckSections = useMemo(() => {
    const sections = groupDecksByModule(modules, decks, searchQuery)
    return sections.map((section) => ({
      ...section,
      decks: sortDecksPinnedFirst(section.decks, pinnedDeckIds),
    }))
  }, [modules, decks, searchQuery, pinnedDeckIds])

  const filteredDeckCount = useMemo(
    () => deckSections.reduce((sum, section) => sum + section.decks.length, 0),
    [deckSections],
  )

  const nextModuleSortOrder = useMemo(() => {
    if (modules.length === 0) return 0
    return Math.max(...modules.map((module) => module.sortOrder)) + 1
  }, [modules])

  const totalCards = decks.reduce(
    (sum, deck) => sum + (deck.totalCards ?? 0),
    0,
  )

  const aggregated = decks.reduce(
    (acc, deck) => {
      const counts = getDeckTodayCounts(deck)
      return {
        newCards: acc.newCards + counts.newCount,
        learningCards: acc.learningCards + counts.learnCount,
        newDue: acc.newDue + counts.availableNewToday,
        learningDue: acc.learningDue + counts.learnCount,
        reviewDue: acc.reviewDue + counts.reviewCount,
        dueToday: acc.dueToday + getDeckDueToday(counts),
      }
    },
    {
      newCards: 0,
      learningCards: 0,
      newDue: 0,
      learningDue: 0,
      reviewDue: 0,
      dueToday: 0,
    },
  )

  const { newCards, learningCards, newDue, learningDue, reviewDue, dueToday } =
    aggregated

  const handleStartStudy = async (deckId: string) => {
    const summary = await getDueCardsSummary(deckId)

    if (!summary) {
      showToast('Failed to load study session. Please try again.', 'error')
      return
    }

    if (summary.cards.length === 0) {
      if (summary.isNewCardsLimitReached) {
        showToast(
          `Daily new cards limit reached (${summary.newCardsStudiedToday}/${summary.newCardsDailyLimit}). Come back tomorrow for more new cards!`,
          'info',
        )
      } else {
        showToast(
          'All cards have been studied! No cards due for review.',
          'info',
        )
      }
      return
    }

    navigate({ to: '/decks/$deckId/study', params: { deckId } })
  }

  const handleCreateDeck = () => navigate({ to: '/decks/create' })

  const handleAssignModule = async (
    deckId: string,
    moduleId: string | null,
  ) => {
    setAssigningDeckId(deckId)
    try {
      await handleUpdateDeck(deckId, { moduleId })
    } catch {
      // toast handled in provider
    } finally {
      setAssigningDeckId(null)
    }
  }

  const moduleById = useMemo(
    () => new Map(modules.map((module) => [module.id, module])),
    [modules],
  )

  return (
    <AnimatedPage data-testid="dashboard-page">
      <PageHeader
        title="Your Decks"
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <label htmlFor="dashboard-search" className="sr-only">
                Search decks...
              </label>
              <Input
                id="dashboard-search"
                data-testid="dashboard-search-input"
                type="search"
                placeholder="Search decks..."
                className="w-full py-2 pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={16}
              />
            </div>
            <Button
              type="button"
              variant="neutral"
              onClick={() => setCreatingModule(true)}
              data-testid="dashboard-create-module-button"
              className="shrink-0"
            >
              <Plus size={16} strokeWidth={1.5} />
              New module
            </Button>
            <Button
              onClick={handleCreateDeck}
              data-testid="dashboard-create-deck-button"
              className="shrink-0"
            >
              <Plus size={16} strokeWidth={1.5} />
              New deck
            </Button>
          </div>
        }
      />

      <DashboardSummarySection
        dueToday={dueToday}
        newDue={newDue}
        learningDue={learningDue}
        reviewDue={reviewDue}
        totalCards={totalCards}
        newCards={newCards}
        learningCards={learningCards}
        deckCount={decks.length}
        loading={loading.decks}
      />

      <DecksByModuleList
        deckCount={filteredDeckCount}
        sections={deckSections}
        modules={modules}
        moduleById={moduleById}
        assigningDeckId={assigningDeckId}
        loading={loading.decks}
        onCreateDeck={handleCreateDeck}
        onStartStudy={handleStartStudy}
        onAddCards={(id) =>
          navigate({ to: '/decks/$deckId/cards/add', params: { deckId: id } })
        }
        onAssignModule={handleAssignModule}
        onEditDeck={(id) => {
          const found = decks.find((deck) => deck.id === id)
          if (found) setEditingDeck(found)
        }}
        onDeleteDeck={(id) => {
          const found = decks.find((deck) => deck.id === id)
          if (found) setDeletingDeck(found)
        }}
        onEditModule={setEditingModule}
        onDeleteModule={setDeletingModule}
        pinnedDeckIds={pinnedDeckIds}
        onTogglePin={togglePin}
      />

      <EditDeckModal
        isOpen={!!editingDeck}
        onClose={() => setEditingDeck(null)}
        deck={editingDeck}
        modules={modules}
        onSave={handleUpdateDeck}
        loading={loading.updateDeck}
      />

      <CreateModuleModal
        isOpen={creatingModule}
        onClose={() => setCreatingModule(false)}
        nextSortOrder={nextModuleSortOrder}
        loading={loading.createModule}
        onSave={async (data) => {
          await handleCreateModule(data)
        }}
      />

      <EditModuleModal
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        module={editingModule}
        onSave={handleUpdateModule}
        loading={loading.updateModule}
      />

      <ConfirmDialog
        isOpen={!!deletingDeck}
        onClose={() => setDeletingDeck(null)}
        onConfirm={async () => {
          if (deletingDeck) {
            await handleDeleteDeck(deletingDeck.id)
            setDeletingDeck(null)
          }
        }}
        title="Delete Deck"
        message={`Are you sure you want to delete "${deletingDeck?.name}"? All cards in this deck will be permanently lost.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading.deleteDeck}
      />

      <ConfirmDialog
        isOpen={!!deletingModule}
        onClose={() => setDeletingModule(null)}
        onConfirm={async () => {
          if (deletingModule) {
            await handleDeleteModule(deletingModule.id)
            setDeletingModule(null)
          }
        }}
        title="Delete Module"
        message={`Are you sure you want to delete "${deletingModule?.name}"? Decks in this module will become unassigned.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={loading.deleteModule}
      />
    </AnimatedPage>
  )
}
