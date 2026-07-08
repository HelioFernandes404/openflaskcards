import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { SkeletonCard } from '@/shared/components/skeleton'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { useStudyPlans } from '../hooks/useStudyPlans'
import { StudyPlanCard } from '../components/StudyPlanCard'

export function StudyPlansList() {
  const navigate = useNavigate()
  const { plans, loading, deleteStudyPlan } = useStudyPlans()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleConfirmDelete = () => {
    if (pendingDeleteId) deleteStudyPlan(pendingDeleteId)
    setPendingDeleteId(null)
  }

  return (
    <div
      className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="study-plans-list-page"
    >
      <PageHeader
        title="Study Plans"
        subtitle="Ordered routines for what to study, and in what order"
        backTo="/"
        actions={
          <Button
            data-testid="new-study-plan-button"
            className="gap-2"
            onClick={() => navigate({ to: '/study-plans/create' })}
          >
            <Plus size={16} /> New Plan
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No study plans yet"
          hint="Create a plan to lay out the order you want to study things in."
          action={
            <Button
              className="gap-2"
              onClick={() => navigate({ to: '/study-plans/create' })}
            >
              <Plus size={16} /> New Plan
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <StudyPlanCard
              key={plan.id}
              plan={plan}
              onView={(id) =>
                navigate({ to: '/study-plans/$planId', params: { planId: id } })
              }
              onEdit={(id) =>
                navigate({
                  to: '/study-plans/$planId/edit',
                  params: { planId: id },
                })
              }
              onDelete={(id) => setPendingDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete study plan"
        message="This study plan will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
