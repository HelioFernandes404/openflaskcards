import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { DashboardStatsStrip } from '@/features/dashboard/components/DashboardStatsStrip'
import { StudyTodayPanel } from '@/features/dashboard/components/StudyTodayPanel'
import { useDashboardSummaryVisible } from '@/features/dashboard/hooks/useDashboardSummaryVisible'
import { cn } from '@/shared/utils'

interface DashboardSummarySectionProps {
  dueToday: number
  newDue: number
  learningDue: number
  reviewDue: number
  totalCards: number
  newCards: number
  learningCards: number
  deckCount: number
  loading?: boolean
}

export function DashboardSummarySection({
  dueToday,
  newDue,
  learningDue,
  reviewDue,
  totalCards,
  newCards,
  learningCards,
  deckCount,
  loading,
}: DashboardSummarySectionProps) {
  const [visible, setVisible] = useDashboardSummaryVisible()

  if (!visible) {
    return (
      <section className="mb-4" data-testid="dashboard-summary-collapsed">
        <button
          type="button"
          data-testid="dashboard-show-summary-button"
          onClick={() => setVisible(true)}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant',
            'bg-surface-container-low px-4 py-2.5 text-left transition-colors',
            'hover:bg-surface-container',
          )}
        >
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <BarChart2
              size={14}
              className="shrink-0 text-on-surface-variant"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            {loading ? (
              <span className="text-sm text-on-surface-variant">
                Loading summary…
              </span>
            ) : (
              <>
                <span className="font-mono text-2xs text-on-surface-variant tabular-nums">
                  {dueToday > 0 ? `${dueToday} due today` : 'All caught up'}
                </span>
                <span className="hidden text-muted sm:inline">·</span>
                <span className="hidden font-mono text-2xs text-on-surface-variant tabular-nums sm:inline">
                  {totalCards} cards · {deckCount} decks
                </span>
              </>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm text-on-surface-variant">
            Show summary
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
          </span>
        </button>
      </section>
    )
  }

  return (
    <section
      className="mb-4 space-y-3"
      data-testid="dashboard-summary-expanded"
    >
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="dashboard-hide-summary-button"
          onClick={() => setVisible(false)}
          className="gap-1.5 text-on-surface-variant"
        >
          Hide summary
          <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </div>

      <StudyTodayPanel
        dueToday={dueToday}
        newDue={newDue}
        learningDue={learningDue}
        reviewDue={reviewDue}
        loading={loading}
      />
      <DashboardStatsStrip
        loading={loading}
        items={[
          { label: 'Cards', value: totalCards },
          { label: 'New', value: newCards },
          { label: 'Learning', value: learningCards },
          { label: 'Decks', value: deckCount },
        ]}
      />
    </section>
  )
}
