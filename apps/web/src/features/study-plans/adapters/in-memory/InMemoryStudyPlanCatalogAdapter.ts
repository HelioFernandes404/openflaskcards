import { createEmptyProgressRecord } from '../../domain/studyPlanProgress'
import type {
  StudyPlan,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from '../../domain/studyPlan'
import type { StudyPlanCatalogPort } from '../../ports/StudyPlanCatalogPort'
import type { InMemoryStudyPlanDatabase } from './InMemoryStudyPlanDatabase'

export class InMemoryStudyPlanCatalogAdapter implements StudyPlanCatalogPort {
  private readonly database: InMemoryStudyPlanDatabase

  constructor(database: InMemoryStudyPlanDatabase) {
    this.database = database
  }

  async listPlans(): Promise<StudyPlan[]> {
    return [...this.database.plans]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((plan) => this.database.withEmbeddedSessionProgress(plan))
  }

  async getPlanById(planId: string): Promise<StudyPlan> {
    return this.database.withEmbeddedSessionProgress(
      this.database.requirePlan(planId),
    )
  }

  async createPlan(input: StudyPlanCreateInput): Promise<StudyPlan> {
    const plan: StudyPlan = {
      id: `plan-${this.database.plans.length + 1}`,
      title: input.title,
      level: input.level ?? '',
      goal: input.goal ?? '',
      goldenRule: input.goldenRule ?? '',
      flexibility: input.flexibility ?? '',
      noFixedDeadline: input.noFixedDeadline ?? true,
      steps: input.steps ?? [],
      userId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: createEmptyProgressRecord(),
    }
    this.database.plans.push(plan)
    return plan
  }

  async updatePlan(
    planId: string,
    input: StudyPlanUpdateInput,
  ): Promise<StudyPlan> {
    const index = this.database.plans.findIndex((plan) => plan.id === planId)
    if (index === -1) throw new Error('Study plan not found')
    this.database.plans[index] = {
      ...this.database.plans[index],
      ...input,
      updatedAt: new Date().toISOString(),
    }
    return this.database.withEmbeddedSessionProgress(this.database.plans[index])
  }

  async deletePlan(planId: string): Promise<void> {
    const index = this.database.plans.findIndex((plan) => plan.id === planId)
    if (index === -1) throw new Error('Study plan not found')
    this.database.plans.splice(index, 1)
    delete this.database.sessionProgressByPlanId[planId]
  }
}
