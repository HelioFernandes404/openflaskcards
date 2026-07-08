import { CheckCircle2, Flame, Play, Sparkles, Trophy, Zap } from 'lucide-react'
import { Badge } from '@/shared/components/badge'
import { Button } from '@/shared/components/button'
import { cn } from '@/shared/utils'
import type { StudyPlanDailyProgress } from '../domain/studyPlanProgress'
import { StudyPlanWeekStrip } from './StudyPlanWeekStrip'

interface StudyPlanSessionPanelProps {
  daily: StudyPlanDailyProgress
  runMode: boolean
  onStartRun: () => void
}

export function StudyPlanSessionPanel({
  daily,
  runMode,
  onStartRun,
}: StudyPlanSessionPanelProps) {
  if (daily.totalSteps === 0) return null

  return (
    <section
      className="mb-6 rounded-xl border border-outline bg-surface-container-low px-5 py-4"
      data-testid="study-plan-session-panel"
      aria-label="Today's study session"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant mb-1">
            Today&apos;s run
          </p>
          <p className="font-display text-2xl font-semibold text-on-surface tabular-nums">
            {daily.completedCount}
            <span className="mx-1.5 text-on-surface-variant font-normal">
              /
            </span>
            {daily.totalSteps}
            <span className="ml-2 font-mono text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              steps
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {daily.streak > 0 && (
            <Badge variant="neutral" className="gap-1.5 px-2.5 py-1">
              <Flame
                size={13}
                className="text-warning-600"
                strokeWidth={1.75}
              />
              {daily.streak === 1
                ? '1-day streak'
                : `${daily.streak}-day streak`}
            </Badge>
          )}
          <Badge
            variant="outlined"
            className="gap-1.5 px-2.5 py-1 tabular-nums"
          >
            <Zap size={13} strokeWidth={1.75} />
            {daily.totalXp} XP
          </Badge>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-outline bg-surface-container px-3 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant">
            Level {daily.level.level} · {daily.level.title}
          </p>
          {daily.level.xpForNextLevel != null && (
            <span className="font-mono text-2xs text-on-surface-variant tabular-nums">
              {daily.level.xpForNextLevel} XP to next
            </span>
          )}
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full border border-outline bg-surface-container-low"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={daily.level.progressPercent}
          aria-label="Level progress"
        >
          <div
            className="h-full bg-on-surface transition-all duration-500"
            style={{ width: `${daily.level.progressPercent}%` }}
          />
        </div>
      </div>

      <div
        className="mb-4 h-2 overflow-hidden rounded-full border border-outline bg-surface-container"
        data-testid="study-plan-daily-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={daily.progressPercent}
        aria-label={`${daily.progressPercent}% of today's steps completed`}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            daily.isFullSession
              ? 'bg-success-600'
              : daily.hasDailyWin
                ? 'bg-primary'
                : 'bg-on-surface',
          )}
          style={{ width: `${daily.progressPercent}%` }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {daily.isFullSession ? (
          <span className="inline-flex items-center gap-1.5 text-success-800">
            <Trophy size={15} strokeWidth={1.75} className="text-success-600" />
            Full session complete
            {daily.xpEarnedToday > 0 && (
              <span className="font-mono text-2xs text-success-600 tabular-nums">
                +{daily.xpEarnedToday} XP today
              </span>
            )}
          </span>
        ) : daily.hasDailyWin ? (
          <span className="inline-flex items-center gap-1.5 text-on-surface">
            <CheckCircle2
              size={15}
              strokeWidth={1.75}
              className="text-success-600"
            />
            Day saved — step 1 done counts
          </span>
        ) : (
          <span className="text-on-surface-variant">
            Start a focused run or tap steps below
          </span>
        )}

        {daily.longestStreak > 1 && daily.longestStreak !== daily.streak && (
          <span className="font-mono text-2xs text-on-surface-variant tabular-nums">
            Best streak {daily.longestStreak} days
          </span>
        )}

        {daily.nextStepOrder != null && !daily.isFullSession && !runMode && (
          <span className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
            <Sparkles size={12} strokeWidth={1.75} />
            Next up · step {daily.nextStepOrder}
          </span>
        )}
      </div>

      <div className="mb-4">
        <StudyPlanWeekStrip days={daily.week} />
      </div>

      {!runMode && !daily.isFullSession && (
        <Button
          type="button"
          className="gap-2"
          onClick={onStartRun}
          data-testid="study-plan-start-run-button"
        >
          <Play size={16} strokeWidth={1.75} />
          {daily.completedCount === 0 ? "Start today's run" : 'Continue run'}
        </Button>
      )}
    </section>
  )
}
