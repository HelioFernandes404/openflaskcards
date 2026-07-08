import { Timer } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/tooltip'
import { cn } from '@/shared/utils'

interface StudyAutoFlipControlsProps {
  enabled: boolean
  seconds: number
  remainingSeconds: number | null
  onToggle: () => void
  className?: string
}

export function StudyAutoFlipControls({
  enabled,
  seconds,
  remainingSeconds,
  onToggle,
  className,
}: StudyAutoFlipControlsProps) {
  const progress =
    enabled && remainingSeconds !== null
      ? ((seconds - remainingSeconds) / seconds) * 100
      : 0

  const tooltipLabel = enabled
    ? `Auto-flip on — reveals answer in ${remainingSeconds ?? seconds}s`
    : `Auto-flip off — click to reveal answer after ${seconds}s`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-testid="study-session-auto-flip-toggle"
            onClick={onToggle}
            aria-pressed={enabled}
            aria-label={
              enabled
                ? `Auto-flip enabled, ${remainingSeconds ?? seconds} seconds remaining`
                : 'Enable auto-flip countdown'
            }
            className={cn(
              'relative inline-flex items-center gap-1.5 overflow-hidden rounded-md border px-2 py-1 font-mono text-2xs uppercase tracking-wider transition-colors',
              enabled
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-outline bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              className,
            )}
          >
            {enabled && (
              <span
                className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
                aria-hidden
              />
            )}
            <Timer size={12} strokeWidth={1.75} className="relative shrink-0" />
            <span className="relative">
              {enabled
                ? `Auto ${remainingSeconds ?? seconds}s`
                : 'Auto-flip off'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
