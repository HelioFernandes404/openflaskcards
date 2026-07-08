import { useMemo, useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { Button } from '@/shared/components/button'
import { Badge } from '@/shared/components/badge'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { PageHeader } from '@/shared/layout/PageHeader'
import {
  StudyPlanRunPanel,
  StudyPlanRunSummary,
} from '../components/StudyPlanRunPanel'
import { StudyPlanSessionPanel } from '../components/StudyPlanSessionPanel'
import { StudyPlanStepItem } from '../components/StudyPlanStepItem'
import type { StudyPlanStepActionType } from '../domain/studyPlanStepActions'
import { useStudyPlan } from '../hooks/useStudyPlan'
import { useStudyPlanProgress } from '../hooks/useStudyPlanProgress'
import { useStudyPlanRunActions } from '../hooks/useStudyPlanRunActions'
import { useStudyPlans } from '../hooks/useStudyPlans'

export function StudyPlanView() {
  const navigate = useNavigate()
  const { planId } = useParams({ strict: false })
  const { showToast } = useNotification()
  const { plan, loading } = useStudyPlan(planId)
  const { deleteStudyPlan } = useStudyPlans()
  const { startFlashcards, openWriting, openErrorNotebook, openLetters } =
    useStudyPlanRunActions()

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [runMode, setRunMode] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showAllSteps, setShowAllSteps] = useState(true)

  const stepOrders = useMemo(
    () => plan?.steps.map((step) => step.order) ?? [],
    [plan?.steps],
  )
  const { daily, toggleStep } = useStudyPlanProgress(planId, stepOrders)

  const currentRunStep = useMemo(() => {
    if (!plan || plan.steps.length === 0) return null
    const targetOrder = daily.nextStepOrder ?? plan.steps[0]?.order
    return (
      plan.steps.find((step) => step.order === targetOrder) ?? plan.steps[0]
    )
  }, [plan, daily.nextStepOrder])

  const handleStepToggle = (stepOrder: number) => {
    const outcome = toggleStep(stepOrder)
    if (outcome.reachedFullSession) {
      showToast('Full session complete — nice run!', 'success')
      return
    }
    if (outcome.completed && outcome.reachedDailyWin) {
      showToast('Step 1 done — day saved.', 'success')
    }
  }

  const handleRunAction = (type: StudyPlanStepActionType) => {
    switch (type) {
      case 'flashcards':
        void startFlashcards()
        break
      case 'letters':
        openLetters()
        break
      case 'writing':
        openWriting()
        break
      case 'error_notebook':
        openErrorNotebook()
        break
      default:
        break
    }
  }

  const handleCompleteRunStep = () => {
    if (!currentRunStep) return
    const outcome = toggleStep(currentRunStep.order)
    if (outcome.reachedFullSession) {
      setShowSummary(true)
      showToast('Full session complete — nice run!', 'success')
      return
    }
    if (outcome.completed && outcome.reachedDailyWin) {
      showToast('Day saved — keep going or end the run.', 'success')
    }
  }

  const handleStartRun = () => {
    setRunMode(true)
    setShowSummary(false)
    setShowAllSteps(false)
  }

  const handleEndRun = () => {
    setRunMode(false)
    if (daily.hasDailyWin || daily.isFullSession) {
      setShowSummary(true)
    } else {
      setShowAllSteps(true)
    }
  }

  const handleCloseSummary = () => {
    setShowSummary(false)
    setRunMode(false)
    setShowAllSteps(true)
  }

  const handleDelete = async () => {
    if (!planId) return
    setConfirmingDelete(false)
    await deleteStudyPlan(planId)
    navigate({ to: '/study-plans' })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto" data-testid="study-plan-view-page">
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    )
  }

  if (!plan) return null

  return (
    <div
      className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="study-plan-view-page"
    >
      <PageHeader
        title={plan.title}
        subtitle={
          [plan.level, plan.goal].filter(Boolean).join(' · ') || undefined
        }
        backTo="/study-plans"
        actions={
          <>
            <Button
              variant="neutral"
              className="gap-2"
              data-testid="study-plan-view-edit-button"
              onClick={() =>
                navigate({
                  to: '/study-plans/$planId/edit',
                  params: { planId: plan.id },
                })
              }
            >
              <Edit size={16} /> Edit
            </Button>
            <Button
              variant="danger"
              className="gap-2"
              data-testid="study-plan-view-delete-button"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 size={16} /> Delete
            </Button>
          </>
        }
      />

      <StudyPlanSessionPanel
        daily={daily}
        runMode={runMode}
        onStartRun={handleStartRun}
      />

      {showSummary && (
        <StudyPlanRunSummary
          daily={daily}
          onClose={handleCloseSummary}
          onViewAllSteps={() => {
            setShowSummary(false)
            setRunMode(false)
            setShowAllSteps(true)
          }}
        />
      )}

      {runMode && currentRunStep && !daily.isFullSession && !showSummary && (
        <StudyPlanRunPanel
          plan={plan}
          step={currentRunStep}
          daily={daily}
          onCompleteStep={handleCompleteRunStep}
          onEndRun={handleEndRun}
          onRunAction={handleRunAction}
        />
      )}

      {plan.goldenRule && (
        <div className="mb-6 rounded-xl border border-outline border-l-[3px] border-l-primary bg-surface-container-high px-6 py-5">
          <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant mb-2">
            Golden rule
          </p>
          <p className="font-display text-lg leading-snug text-on-surface">
            {plan.goldenRule}
          </p>
        </div>
      )}

      <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {plan.flexibility && (
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant mb-1.5">
              Flexibility
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {plan.flexibility}
            </p>
          </div>
        )}
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant mb-1.5">
            Deadline
          </p>
          <Badge variant={plan.noFixedDeadline ? 'outlined' : 'neutral'}>
            {plan.noFixedDeadline ? 'No fixed deadline' : 'Fixed deadline'}
          </Badge>
        </div>
      </div>

      {(showAllSteps || !runMode) && (
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant">
              Sequence ·{' '}
              {plan.steps.length === 1
                ? '1 step'
                : `${plan.steps.length} steps`}
            </p>
            {runMode && !showAllSteps && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSteps(true)}
              >
                Show all steps
              </Button>
            )}
          </div>

          {plan.steps.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No steps yet.</p>
          ) : (
            <ol>
              {plan.steps.map((step, index) => (
                <StudyPlanStepItem
                  key={`${step.order}-${index}`}
                  step={step}
                  index={index}
                  isLast={index === plan.steps.length - 1}
                  completed={daily.completedOrders.includes(step.order)}
                  isCurrent={daily.nextStepOrder === step.order}
                  onToggle={() => handleStepToggle(step.order)}
                  onAction={handleRunAction}
                  showTimer={!runMode}
                />
              ))}
            </ol>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete study plan"
        message="This study plan will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
