import { Check, ExternalLink, Play } from 'lucide-react'
import { Badge } from '@/shared/components/badge'
import { Button } from '@/shared/components/button'
import { cn } from '@/shared/utils'
import {
  inferStepAction,
  getStepTimerMinutes,
  type StudyPlanStepActionType,
} from '../domain/studyPlanStepActions'
import type { StudyPlanStep } from '../types/studyPlan'
import { StudyPlanStepTimer } from './StudyPlanStepTimer'

interface StudyPlanStepItemProps {
  step: StudyPlanStep
  index: number
  isLast: boolean
  completed: boolean
  isCurrent: boolean
  onToggle: () => void
  onAction?: (type: StudyPlanStepActionType) => void
  showTimer?: boolean
}

export function StudyPlanStepItem({
  step,
  index,
  isLast,
  completed,
  isCurrent,
  onToggle,
  onAction,
  showTimer = false,
}: StudyPlanStepItemProps) {
  const action = inferStepAction(step)
  const showDeepLink =
    onAction && !completed && action.type !== 'generic' && !action.usesTimer

  return (
    <li
      className={cn(
        'relative pl-12 pb-9 last:pb-0 transition-opacity duration-300',
        completed && 'opacity-80',
      )}
      data-testid={`study-plan-view-step-${index}`}
    >
      {!isLast && (
        <span
          aria-hidden
          className={cn(
            'absolute left-4 top-8 bottom-0 border-l transition-colors duration-300',
            completed
              ? 'border-success-600 border-solid'
              : 'border-dashed border-outline-strong',
          )}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={completed}
        aria-label={
          completed
            ? `Mark step ${step.order} as incomplete: ${step.activity}`
            : `Complete step ${step.order}: ${step.activity}`
        }
        className={cn(
          'absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border font-mono text-xs transition-all duration-300',
          'focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-2',
          completed
            ? 'border-success-600 bg-success-600 text-on-success'
            : isCurrent
              ? 'border-primary bg-surface-container-high text-on-surface ring-2 ring-primary/20'
              : 'border-outline-strong bg-surface-container-high text-on-surface hover:border-outline hover:bg-surface-container',
        )}
        data-testid={`study-plan-step-toggle-${index}`}
      >
        {completed ? <Check size={14} strokeWidth={2.5} /> : step.order}
      </button>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-0.5">
        <h3
          className={cn(
            'font-display text-base font-semibold transition-colors',
            completed
              ? 'text-on-surface-variant line-through decoration-outline-strong'
              : 'text-on-surface',
          )}
        >
          {step.activity}
        </h3>
        {step.duration && (
          <Badge variant={completed ? 'outlined' : 'neutral'}>
            {step.duration}
          </Badge>
        )}
        {isCurrent && !completed && (
          <Badge
            variant="neutral"
            className="font-mono text-2xs uppercase tracking-wider"
          >
            Up next
          </Badge>
        )}
      </div>

      {step.notes && (
        <p
          className={cn(
            'mt-1.5 text-sm leading-relaxed transition-colors',
            completed
              ? 'text-muted line-through decoration-outline-strong/60'
              : 'text-on-surface-variant',
          )}
        >
          {step.notes}
        </p>
      )}

      {!completed && showTimer && action.usesTimer && (
        <StudyPlanStepTimer
          key={`step-${step.order}-${getStepTimerMinutes(step)}`}
          minutes={getStepTimerMinutes(step)}
          className="mt-3"
        />
      )}

      {showDeepLink && (
        <div className="mt-3">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            className="gap-1.5"
            onClick={() => onAction?.(action.type)}
            data-testid={`study-plan-step-action-${index}`}
          >
            {action.usesTimer ? <Play size={14} /> : <ExternalLink size={14} />}
            {action.label}
          </Button>
        </div>
      )}
    </li>
  )
}
