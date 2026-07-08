import { ArrowLeft, CheckCircle2, Flame, Timer, Zap } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { Card } from '@/shared/components/card'
import type { StudySessionSummary } from '../domain/sessionGamification'
import {
  compareWithPreviousSession,
  formatDurationMs,
} from '../domain/sessionGamification'
import type { StoredSessionSnapshot } from '../domain/sessionGamification'
import { formatStudyTimer } from '../domain/sessionGamification'

interface StudySessionSummaryCardProps {
  summary: StudySessionSummary
  previousSession: StoredSessionSnapshot | null
  onExit: () => void
}

export function StudySessionSummaryCard({
  summary,
  previousSession,
  onExit,
}: StudySessionSummaryCardProps) {
  const comparison = compareWithPreviousSession(summary, previousSession)

  return (
    <Card
      className="w-full max-w-md p-8 text-center"
      data-testid="study-session-summary-card"
    >
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-success-200 bg-success-50">
        <CheckCircle2
          size={40}
          className="text-success-600"
          strokeWidth={1.5}
        />
      </div>

      <h2 className="mb-2 text-3xl font-semibold">Session Complete!</h2>
      <p className="mb-6 font-medium text-on-surface-variant">
        You reviewed {summary.totalCards} cards in{' '}
        {formatStudyTimer(summary.timerSeconds)}.
      </p>

      {summary.clearedQueue && (
        <p
          className="mb-4 text-sm font-medium text-success-700"
          data-testid="study-session-cleared-queue"
        >
          Queue cleared for this deck.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 text-left">
        <StatTile
          label="Good / Easy"
          value={`${summary.successRate}%`}
          icon={<Zap size={14} strokeWidth={1.5} />}
        />
        <StatTile
          label="Best combo"
          value={summary.maxCombo > 1 ? `${summary.maxCombo}x` : '—'}
          icon={<Flame size={14} strokeWidth={1.5} />}
        />
        <StatTile
          label="Fastest card"
          value={summary.fastestMs ? formatDurationMs(summary.fastestMs) : '—'}
          icon={<Timer size={14} strokeWidth={1.5} />}
        />
        <StatTile
          label="Slowest card"
          value={summary.slowestMs ? formatDurationMs(summary.slowestMs) : '—'}
          icon={<Timer size={14} strokeWidth={1.5} />}
        />
      </div>

      <div
        className="mb-6 rounded-lg border border-outline bg-surface-container-low p-4 text-left"
        data-testid="study-session-rating-breakdown"
      >
        <p className="mb-3 text-2xs font-medium uppercase tracking-wider text-on-surface-variant">
          Rating breakdown
        </p>
        <div className="grid grid-cols-4 gap-2 text-center font-mono text-2xs tabular-nums">
          <BreakdownItem
            label="Again"
            value={summary.againCount}
            tone="danger"
          />
          <BreakdownItem label="Hard" value={summary.hardCount} />
          <BreakdownItem label="Good" value={summary.goodCount} />
          <BreakdownItem
            label="Easy"
            value={summary.easyCount}
            tone="success"
          />
        </div>
      </div>

      {comparison && (
        <p
          className="mb-6 text-sm text-on-surface-variant"
          data-testid="study-session-comparison"
        >
          {comparison}
        </p>
      )}

      <Button
        className="flex w-full items-center justify-center gap-2 py-3 text-lg"
        onClick={onExit}
      >
        <ArrowLeft size={18} strokeWidth={1.5} /> Back to Dashboard
      </Button>
    </Card>
  )
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-outline bg-surface-container-low p-3">
      <div className="mb-1 flex items-center gap-1.5 text-2xs uppercase tracking-wider text-on-surface-variant">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function BreakdownItem({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'danger' | 'success'
}) {
  return (
    <div>
      <p className="mb-1 text-muted">{label}</p>
      <p
        className={
          tone === 'danger'
            ? 'text-danger-700'
            : tone === 'success'
              ? 'text-success-700'
              : 'text-on-surface'
        }
      >
        {value}
      </p>
    </div>
  )
}
