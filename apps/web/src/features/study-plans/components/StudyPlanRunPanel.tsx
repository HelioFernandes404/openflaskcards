import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Music2,
  NotebookPen,
  Play,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { Button } from '@/shared/components/button'
import { Badge } from '@/shared/components/badge'
import {
  getStepTimerMinutes,
  inferStepAction,
  type StudyPlanStepActionType,
} from '../domain/studyPlanStepActions'
import type { StudyPlanDailyProgress } from '../domain/studyPlanProgress'
import type { StudyPlan, StudyPlanStep } from '../types/studyPlan'
import { StudyPlanStepTimer } from './StudyPlanStepTimer'

interface StudyPlanRunPanelProps {
  plan: StudyPlan
  step: StudyPlanStep
  daily: StudyPlanDailyProgress
  onCompleteStep: () => void
  onEndRun: () => void
  onRunAction: (type: StudyPlanStepActionType) => void
}

function actionIcon(type: StudyPlanStepActionType) {
  switch (type) {
    case 'flashcards':
      return Sparkles
    case 'letters':
      return Music2
    case 'writing':
    case 'error_notebook':
      return NotebookPen
    case 'input':
      return BookOpen
    default:
      return Play
  }
}

export function StudyPlanRunPanel({
  plan,
  step,
  daily,
  onCompleteStep,
  onEndRun,
  onRunAction,
}: StudyPlanRunPanelProps) {
  const action = inferStepAction(step)
  const ActionIcon = actionIcon(action.type)
  const showDeepLink = action.type !== 'generic' && !action.usesTimer
  const timerMinutes = getStepTimerMinutes(step)

  return (
    <section
      className="mb-8 rounded-2xl border border-outline bg-surface-container-low p-5 sm:p-6"
      data-testid="study-plan-run-panel"
      aria-label="Today's focused run"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant mb-1">
            Run mode
          </p>
          <p className="font-display text-lg font-semibold text-on-surface">
            Step {step.order} of {plan.steps.length}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-on-surface-variant"
          onClick={onEndRun}
          data-testid="study-plan-end-run-button"
        >
          <X size={14} />
          End run
        </Button>
      </div>

      <div className="mb-5 rounded-xl border border-outline bg-surface-container-high px-5 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="neutral"
            className="font-mono text-2xs uppercase tracking-wider"
          >
            Now
          </Badge>
          {step.duration && <Badge variant="outlined">{step.duration}</Badge>}
        </div>
        <h2 className="font-display text-2xl font-semibold text-on-surface mb-2">
          {step.activity}
        </h2>
        {step.notes && (
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {step.notes}
          </p>
        )}
      </div>

      {action.usesTimer && (
        <StudyPlanStepTimer
          key={`run-${step.order}-${timerMinutes}`}
          minutes={timerMinutes}
          className="mb-5"
        />
      )}

      {showDeepLink && (
        <Button
          type="button"
          variant="neutral"
          className="mb-5 w-full gap-2 sm:w-auto"
          onClick={() => onRunAction(action.type)}
          data-testid="study-plan-run-action-button"
        >
          <ActionIcon size={16} strokeWidth={1.75} />
          {action.label}
          <ExternalLink size={14} className="text-on-surface-variant" />
        </Button>
      )}

      {!daily.hasDailyWin && step.order === plan.steps[0]?.order && (
        <p className="mb-4 text-sm text-on-surface-variant">
          Finish this step to save today — even if you stop after this one.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="gap-2"
          onClick={onCompleteStep}
          data-testid="study-plan-run-complete-step-button"
        >
          Mark done
          <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  )
}

interface StudyPlanRunSummaryProps {
  daily: StudyPlanDailyProgress
  onClose: () => void
  onViewAllSteps: () => void
}

export function StudyPlanRunSummary({
  daily,
  onClose,
  onViewAllSteps,
}: StudyPlanRunSummaryProps) {
  return (
    <section
      className="mb-8 rounded-2xl border border-success-200 bg-success-50 px-5 py-6 sm:px-6"
      data-testid="study-plan-run-summary"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-success-200 bg-surface-container">
          <Trophy size={22} className="text-success-600" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-success-800 mb-1">
            Run complete
          </p>
          <h2 className="font-display text-xl font-semibold text-on-surface">
            {daily.isFullSession ? 'Full session done' : 'Solid run today'}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {daily.isFullSession
              ? `You cleared all ${daily.totalSteps} steps.`
              : daily.hasDailyWin
                ? 'Step 1 saved the day — that counts.'
                : 'Nice work showing up.'}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {daily.xpEarnedToday > 0 && (
          <Badge variant="neutral" className="tabular-nums">
            +{daily.xpEarnedToday} XP today
          </Badge>
        )}
        {daily.streak > 0 && (
          <Badge variant="outlined" className="tabular-nums">
            {daily.streak}-day streak
          </Badge>
        )}
        <Badge variant="outlined">
          Level {daily.level.level} · {daily.level.title}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="neutral" onClick={onViewAllSteps}>
          View all steps
        </Button>
        <Button
          type="button"
          onClick={onClose}
          data-testid="study-plan-run-summary-close"
        >
          Done
        </Button>
      </div>
    </section>
  )
}
