import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { Card, CardContent } from '@/shared/components/card'
import { PageHeader } from '@/shared/layout/PageHeader'
import { useStudyPlan } from '../hooks/useStudyPlan'
import { useStudyPlans } from '../hooks/useStudyPlans'
import type { StudyPlanStep } from '../types/studyPlan'

function reorder(steps: StudyPlanStep[]): StudyPlanStep[] {
  return steps.map((step, i) => ({ ...step, order: i + 1 }))
}

export function StudyPlanEditor() {
  const navigate = useNavigate()
  const { planId } = useParams({ strict: false })
  const isEditing = Boolean(planId)
  const { plan, loading: loadingPlan } = useStudyPlan(planId)
  const { createStudyPlan, updateStudyPlan } = useStudyPlans()

  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('')
  const [goal, setGoal] = useState('')
  const [goldenRule, setGoldenRule] = useState('')
  const [flexibility, setFlexibility] = useState('')
  const [noFixedDeadline, setNoFixedDeadline] = useState(true)
  const [steps, setSteps] = useState<StudyPlanStep[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!plan) return
    setTitle(plan.title)
    setLevel(plan.level)
    setGoal(plan.goal)
    setGoldenRule(plan.goldenRule)
    setFlexibility(plan.flexibility)
    setNoFixedDeadline(plan.noFixedDeadline)
    setSteps(plan.steps)
  }, [plan])

  const addStep = () => {
    setSteps((prev) =>
      reorder([
        ...prev,
        { order: prev.length + 1, activity: '', duration: '', notes: '' },
      ]),
    )
  }

  const removeStep = (index: number) => {
    setSteps((prev) => reorder(prev.filter((_, i) => i !== index)))
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return reorder(next)
    })
  }

  const updateStep = (index: number, patch: Partial<StudyPlanStep>) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        level,
        goal,
        goldenRule,
        flexibility,
        noFixedDeadline,
        steps,
      }
      if (planId) {
        await updateStudyPlan(planId, payload)
        navigate({ to: '/study-plans/$planId', params: { planId } })
      } else {
        const created = await createStudyPlan(payload)
        if (created) {
          navigate({
            to: '/study-plans/$planId',
            params: { planId: created.id },
          })
        } else {
          navigate({ to: '/study-plans' })
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="study-plan-editor-page"
    >
      <PageHeader
        title={isEditing ? 'Edit Study Plan' : 'New Study Plan'}
        subtitle={
          isEditing
            ? 'Update your study plan'
            : 'Lay out the order you want to study things in'
        }
        backTo={isEditing && planId ? `/study-plans/${planId}` : '/study-plans'}
      />

      <Card>
        <CardContent className="p-8">
          {loadingPlan ? (
            <p className="text-sm text-on-surface-variant">Loading...</p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
              data-testid="study-plan-editor-form"
            >
              <div>
                <Label htmlFor="plan-title" className="block mb-2">
                  Title
                </Label>
                <Input
                  id="plan-title"
                  data-testid="study-plan-title-input"
                  type="text"
                  className="text-xl"
                  placeholder="e.g. English B1 advancing to B2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plan-level" className="block mb-2">
                    Level
                  </Label>
                  <Input
                    id="plan-level"
                    data-testid="study-plan-level-input"
                    type="text"
                    placeholder="e.g. B1 avançando pra B2"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="plan-goal" className="block mb-2">
                    Goal
                  </Label>
                  <Input
                    id="plan-goal"
                    data-testid="study-plan-goal-input"
                    type="text"
                    placeholder="e.g. trabalho/carreira"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="plan-golden-rule" className="block mb-2">
                  Golden rule
                </Label>
                <Textarea
                  id="plan-golden-rule"
                  data-testid="study-plan-golden-rule-input"
                  className="min-h-[70px]"
                  placeholder="e.g. ordem importa mais que completude"
                  value={goldenRule}
                  onChange={(e) => setGoldenRule(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="plan-flexibility" className="block mb-2">
                  Flexibility
                </Label>
                <Textarea
                  id="plan-flexibility"
                  data-testid="study-plan-flexibility-input"
                  className="min-h-[70px]"
                  placeholder="e.g. sem dias ou horários obrigatórios"
                  value={flexibility}
                  onChange={(e) => setFlexibility(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  data-testid="study-plan-no-fixed-deadline-input"
                  checked={noFixedDeadline}
                  onChange={(e) => setNoFixedDeadline(e.target.checked)}
                  className="size-4"
                />
                No fixed deadline
              </label>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="block">Steps</Label>
                  <Button
                    type="button"
                    variant="neutral"
                    className="gap-1.5 text-sm"
                    onClick={addStep}
                    data-testid="study-plan-add-step-button"
                  >
                    <Plus size={14} /> Add step
                  </Button>
                </div>

                {steps.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    No steps yet. Add the sequence of activities.
                  </p>
                ) : (
                  steps.map((step, index) => (
                    <div
                      key={index}
                      className="border border-outline rounded-lg p-4 flex flex-col gap-3"
                      data-testid={`study-plan-step-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-on-surface-variant">
                          Step {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Move up"
                            className="p-1 hover:bg-surface-container-high rounded-md disabled:opacity-30"
                            onClick={() => moveStep(index, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            className="p-1 hover:bg-surface-container-high rounded-md disabled:opacity-30"
                            onClick={() => moveStep(index, 1)}
                            disabled={index === steps.length - 1}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove step"
                            className="p-1 hover:bg-surface-container-high rounded-md text-error"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <Input
                        type="text"
                        placeholder="Activity (e.g. Flashcards)"
                        value={step.activity}
                        onChange={(e) =>
                          updateStep(index, { activity: e.target.value })
                        }
                      />
                      <Input
                        type="text"
                        placeholder="Duration (e.g. 10-15 min)"
                        value={step.duration}
                        onChange={(e) =>
                          updateStep(index, { duration: e.target.value })
                        }
                      />
                      <Textarea
                        className="min-h-[50px]"
                        placeholder="Notes"
                        value={step.notes}
                        onChange={(e) =>
                          updateStep(index, { notes: e.target.value })
                        }
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="neutral"
                  data-testid="study-plan-editor-cancel-button"
                  className="flex-1 py-3 text-lg"
                  onClick={() => {
                    if (isEditing && planId) {
                      navigate({
                        to: '/study-plans/$planId',
                        params: { planId },
                      })
                    } else {
                      navigate({ to: '/study-plans' })
                    }
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="study-plan-editor-submit-button"
                  className="flex-[2] py-3 text-lg gap-2"
                  disabled={saving || !title.trim()}
                >
                  <Save size={20} /> {saving ? 'Saving...' : 'Save Plan'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
