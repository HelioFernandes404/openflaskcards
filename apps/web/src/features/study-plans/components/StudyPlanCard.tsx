import {
  Clock,
  Edit,
  Eye,
  Flame,
  ListChecks,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu'
import { getDailyProgress } from '../domain/studyPlanProgress'
import type { StudyPlan } from '../types/studyPlan'

interface StudyPlanCardProps {
  plan: StudyPlan
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function StudyPlanCard({
  plan,
  onView,
  onEdit,
  onDelete,
}: StudyPlanCardProps) {
  const stepOrders = plan.steps.map((step) => step.order)
  const daily = getDailyProgress(plan.progress, stepOrders)

  return (
    <Card
      className="flex flex-col group h-full relative overflow-hidden transition-all hover:border-outline-strong cursor-pointer"
      data-testid={`study-plan-item-${plan.id}`}
      onClick={() => onView(plan.id)}
    >
      <CardContent className="p-4 flex flex-col h-full gap-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3
              className="text-base font-semibold tracking-tight mb-1 line-clamp-1 text-on-surface"
              title={plan.title}
            >
              {plan.title}
            </h3>
            <p className="font-mono text-2xs text-on-surface-variant flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {`Updated ${formatUpdatedAt(plan.updatedAt)}`}
            </p>
          </div>

          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            <button
              data-testid={`study-plan-item-view-button-${plan.id}`}
              aria-label="View study plan"
              className="p-1.5 hover:bg-surface-container-high rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-on-surface"
              onClick={(e) => {
                e.stopPropagation()
                onView(plan.id)
              }}
            >
              <Eye
                size={16}
                className="text-on-surface-variant"
                strokeWidth={1.5}
              />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`study-plan-item-menu-button-${plan.id}`}
                  aria-label="Study plan actions"
                  className="p-1.5 hover:bg-surface-container-high rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-on-surface"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical
                    size={16}
                    className="text-on-surface-variant"
                    strokeWidth={1.5}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  data-testid={`study-plan-item-edit-button-${plan.id}`}
                  onClick={() => onEdit(plan.id)}
                >
                  <Edit size={14} strokeWidth={1.5} />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid={`study-plan-item-delete-button-${plan.id}`}
                  className="text-error focus:text-error"
                  onClick={() => onDelete(plan.id)}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(plan.level || plan.goal) && (
          <p className="text-xs text-on-surface-variant line-clamp-1">
            {[plan.level, plan.goal].filter(Boolean).join(' · ')}
          </p>
        )}

        <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
          <ListChecks size={14} strokeWidth={1.5} />
          {plan.steps.length === 1 ? '1 step' : `${plan.steps.length} steps`}
        </p>

        {plan.steps.length > 0 && (
          <div className="mt-auto pt-1 space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-surface-container border border-outline">
              <div
                className={`h-full transition-all ${
                  daily.isFullSession
                    ? 'bg-success-600'
                    : daily.hasDailyWin
                      ? 'bg-primary'
                      : 'bg-on-surface'
                }`}
                style={{ width: `${daily.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
              <span className="font-mono text-2xs tabular-nums">
                Today {daily.completedCount}/{daily.totalSteps}
              </span>
              {daily.streak > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-2xs tabular-nums">
                  <Flame
                    size={12}
                    className="text-warning-600"
                    strokeWidth={1.75}
                  />
                  {daily.streak}d
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
