import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { cn } from '@/shared/utils'

interface StudyPlanStepTimerProps {
  minutes: number
  className?: string
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function StudyPlanStepTimer({
  minutes,
  className,
}: StudyPlanStepTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => minutes * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!running || remainingSeconds <= 0) return

    const interval = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          setRunning(false)
          setFinished(true)
          return 0
        }
        return value - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [running, remainingSeconds])

  const handleReset = () => {
    setRemainingSeconds(minutes * 60)
    setRunning(false)
    setFinished(false)
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-outline bg-surface-container px-4 py-3',
        className,
      )}
      data-testid="study-plan-step-timer"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
          <Timer size={15} strokeWidth={1.75} />
          Focus timer
        </div>
        <span
          className={cn(
            'font-mono text-2xl tabular-nums',
            finished ? 'text-success-600' : 'text-on-surface',
          )}
          data-testid="study-plan-step-timer-display"
        >
          {formatTimer(remainingSeconds)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => setRunning((value) => !value)}
          disabled={finished}
          data-testid="study-plan-step-timer-toggle"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          className="gap-1.5"
          onClick={handleReset}
          data-testid="study-plan-step-timer-reset"
        >
          <RotateCcw size={14} />
          Reset
        </Button>
      </div>

      {finished && (
        <p className="mt-3 text-sm text-success-800">
          Time&apos;s up — mark the step done when you&apos;re ready.
        </p>
      )}
    </div>
  )
}
