import {
  createEmptyProgressRecord,
  type StudyPlanProgressRecord,
} from '../../domain/studyPlanProgress'
import type { StudyPlan } from '../../domain/studyPlan'

export interface InMemoryStudyPlanDatabaseState {
  plans?: StudyPlan[]
  sessionProgressByPlanId?: Record<string, StudyPlanProgressRecord>
}

export class InMemoryStudyPlanDatabase {
  readonly plans: StudyPlan[]
  readonly sessionProgressByPlanId: Record<string, StudyPlanProgressRecord>

  constructor(initial: InMemoryStudyPlanDatabaseState = {}) {
    this.plans = initial.plans ?? []
    this.sessionProgressByPlanId = initial.sessionProgressByPlanId ?? {}
  }

  sessionProgressFor(planId: string): StudyPlanProgressRecord {
    return this.sessionProgressByPlanId[planId] ?? createEmptyProgressRecord()
  }

  withEmbeddedSessionProgress(plan: StudyPlan): StudyPlan {
    return { ...plan, progress: this.sessionProgressFor(plan.id) }
  }

  requirePlan(planId: string): StudyPlan {
    const plan = this.plans.find((item) => item.id === planId)
    if (!plan) throw new Error('Study plan not found')
    return plan
  }
}
