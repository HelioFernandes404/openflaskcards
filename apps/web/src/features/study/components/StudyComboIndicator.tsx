import { Flame } from 'lucide-react'
import { cn } from '@/shared/utils'

interface StudyComboIndicatorProps {
  combo: number
  className?: string
}

export function StudyComboIndicator({
  combo,
  className,
}: StudyComboIndicatorProps) {
  if (combo < 2) return null

  return (
    <div
      data-testid="study-session-combo-indicator"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-warning-700 tabular-nums',
        combo >= 5 && 'border-success-200 bg-success-50 text-success-700',
        className,
      )}
      aria-label={`${combo} card combo`}
    >
      <Flame size={12} strokeWidth={1.75} aria-hidden />
      <span>{combo} combo</span>
    </div>
  )
}
