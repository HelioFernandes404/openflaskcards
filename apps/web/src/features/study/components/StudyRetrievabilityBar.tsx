import { cn } from '@/shared/utils'
import { getRetrievabilityLevel } from '../domain/sessionGamification'

interface StudyRetrievabilityBarProps {
  retrievability: number
  className?: string
}

const TONE_STYLES = {
  fresh: {
    bar: 'bg-success-500',
    text: 'text-success-600',
    track: 'bg-success-100',
  },
  stable: {
    bar: 'bg-warning-500',
    text: 'text-warning-700',
    track: 'bg-warning-100',
  },
  risk: {
    bar: 'bg-danger-500',
    text: 'text-danger-700',
    track: 'bg-danger-100',
  },
} as const

export function StudyRetrievabilityBar({
  retrievability,
  className,
}: StudyRetrievabilityBarProps) {
  const level = getRetrievabilityLevel(retrievability)
  const styles = TONE_STYLES[level.tone]

  return (
    <div
      className={cn('space-y-1.5', className)}
      data-testid="study-session-retrievability-bar"
      aria-label={`Memory energy: ${level.label}, ${level.percent}%`}
    >
      <div className="flex items-center justify-between gap-2 text-2xs uppercase tracking-wider">
        <span className="font-medium text-on-surface-variant">
          Memory energy
        </span>
        <span className={cn('font-mono tabular-nums', styles.text)}>
          {level.label} · {level.percent}%
        </span>
      </div>
      <div
        className={cn(
          'h-1.5 overflow-hidden rounded-full border border-outline/60',
          styles.track,
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            styles.bar,
          )}
          style={{ width: `${level.percent}%` }}
        />
      </div>
    </div>
  )
}
