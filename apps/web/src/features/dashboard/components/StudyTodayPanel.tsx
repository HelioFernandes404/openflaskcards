import { CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/shared/components/skeleton'
import { MotionFade } from '@/shared/components/motion'
import { cn } from '@/shared/utils'

interface StudyTodayPanelProps {
  dueToday: number
  newDue: number
  learningDue: number
  reviewDue: number
  loading?: boolean
}

export function StudyTodayPanel({
  dueToday,
  newDue,
  learningDue,
  reviewDue,
  loading,
}: StudyTodayPanelProps) {
  const isEmpty = !loading && dueToday === 0

  return (
    <MotionFade>
      <div
        className={cn(
          'rounded-xl border border-outline-variant bg-surface-container-low',
          'px-4 py-3 sm:px-5 sm:py-3.5',
        )}
      >
        {loading && (
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-6 w-32 rounded-sm" />
          </div>
        )}

        {isEmpty && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant shrink-0">
                Today
              </span>
              <span className="text-sm text-on-surface">All caught up</span>
              <span className="hidden sm:inline text-sm text-muted">
                · nothing due
              </span>
            </div>
            <CheckCircle2
              size={16}
              className="text-success-600 shrink-0"
              strokeWidth={1.5}
            />
          </div>
        )}

        {!loading && !isEmpty && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
              Today
            </span>
            <span className="font-display text-lg font-semibold text-on-surface tabular-nums">
              {dueToday}
              <span className="ml-1.5 font-mono text-2xs font-medium uppercase tracking-wider text-on-surface-variant">
                due
              </span>
            </span>
            <span className="hidden sm:inline text-muted">·</span>
            <span className="font-mono text-2xs text-on-surface-variant tabular-nums">
              {`${newDue} new · ${learningDue} lrn · ${reviewDue} rev`}
            </span>
          </div>
        )}
      </div>
    </MotionFade>
  )
}
