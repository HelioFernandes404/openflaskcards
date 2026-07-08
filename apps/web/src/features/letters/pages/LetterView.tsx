import { useEffect, useMemo, useState } from 'react'
import { Edit } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { Skeleton } from '@/shared/components/skeleton'
import { PageHeader } from '@/shared/layout/PageHeader'
import { LetterViewHero } from '../components/LetterViewHero'
import { LetterViewToolbar } from '../components/LetterViewToolbar'
import { LetterLyricsPanel } from '../components/LetterLyricsPanel'
import {
  alignLyricsLines,
  getLyricsLineStats,
} from '../domain/alignLyricsLines'
import {
  getLetterViewColumns,
  type LetterViewMode,
} from '../domain/letterViewMode'
import type { Letter } from '../types/letter'

export function LetterView() {
  const { letterId } = useParams({ strict: false })
  const navigate = useNavigate()
  const { decks, studyService, getDueCardsSummary } = useStudyData()
  const { showToast } = useNotification()

  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<LetterViewMode>('both')
  const [revealedLineIds, setRevealedLineIds] = useState<Set<string>>(
    () => new Set(),
  )

  const lines = useMemo(
    () =>
      letter ? alignLyricsLines(letter.originalLyrics, letter.translation) : [],
    [letter],
  )

  const lineStats = useMemo(
    () =>
      letter
        ? getLyricsLineStats(letter.originalLyrics, letter.translation)
        : null,
    [letter],
  )

  const linkedDeck = useMemo(
    () =>
      letter?.deckId
        ? (decks.find((deck) => deck.id === letter.deckId) ?? null)
        : null,
    [decks, letter?.deckId],
  )

  const viewColumns = getLetterViewColumns(viewMode)
  const revealableLineIds = useMemo(
    () => lines.filter((line) => line.portuguese.trim()).map((line) => line.id),
    [lines],
  )

  useEffect(() => {
    if (!letterId) return
    let cancelled = false

    setLoading(true)
    studyService
      .getLetter(letterId)
      .then((loaded) => {
        if (!cancelled) setLetter(loaded)
      })
      .catch((err) => {
        if (cancelled) return
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'Failed to load letter.',
          }),
          'error',
        )
        navigate({ to: '/letters' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [letterId, studyService, showToast, navigate])

  const handleStudyDeck = async () => {
    if (!letter?.deckId) return
    const summary = await getDueCardsSummary(letter.deckId)
    if (!summary?.cards.length) {
      showToast('No cards due in the linked deck right now.', 'info')
      return
    }
    navigate({ to: '/decks/$deckId/study', params: { deckId: letter.deckId } })
  }

  const handleModeChange = (mode: LetterViewMode) => {
    setViewMode(mode)
    if (mode !== 'reveal') {
      setRevealedLineIds(new Set())
    }
  }

  const handleToggleReveal = (lineId: string) => {
    setRevealedLineIds((current) => {
      const next = new Set(current)
      if (next.has(lineId)) next.delete(lineId)
      else next.add(lineId)
      return next
    })
  }

  const handleRevealAll = () => {
    setRevealedLineIds(new Set(revealableLineIds))
  }

  const handleHideAll = () => {
    setRevealedLineIds(new Set())
  }

  if (!letterId) return null

  return (
    <div
      className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="letter-view-page"
    >
      <PageHeader
        title={letter?.title ?? 'Letter'}
        subtitle="Read lyrics side by side or practice with reveal mode"
        backTo="/letters"
        actions={
          letter ? (
            <Button
              type="button"
              variant="neutral"
              className="gap-2"
              data-testid="letter-view-edit-button"
              onClick={() =>
                navigate({
                  to: '/letters/$letterId/edit',
                  params: { letterId: letter.id },
                })
              }
            >
              <Edit size={16} />
              Edit
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-5">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-full max-w-md rounded-full" />
          <div className="rounded-xl border border-outline-variant overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-2 border-b border-outline-variant last:border-b-0"
              >
                <div className="px-6 py-5 md:border-r border-outline-variant">
                  <Skeleton className="h-5 w-4/5" />
                </div>
                <div className="px-6 py-5">
                  <Skeleton className="h-5 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !letter || !lineStats ? null : lines.length === 0 ? (
        <EmptyState
          title="No lyrics yet"
          hint="Add the original lyrics and translation to read them side by side."
          action={
            <Button
              onClick={() =>
                navigate({
                  to: '/letters/$letterId/edit',
                  params: { letterId: letter.id },
                })
              }
            >
              Edit letter
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <LetterViewHero
            artist={letter.artist}
            lineStats={lineStats}
            linkedDeckName={linkedDeck?.name}
            onStudyDeck={
              letter.deckId ? () => void handleStudyDeck() : undefined
            }
          />

          <LetterViewToolbar
            mode={viewMode}
            onModeChange={handleModeChange}
            revealMode={viewMode === 'reveal'}
            canRevealAll={revealableLineIds.length > 0}
            onRevealAll={handleRevealAll}
            onHideAll={handleHideAll}
          />

          <LetterLyricsPanel
            lines={lines}
            columns={viewColumns}
            revealedLineIds={revealedLineIds}
            onToggleReveal={handleToggleReveal}
          />
        </div>
      )}
    </div>
  )
}
