import type {
  StudyPlan,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from '../domain/studyPlan'

/** Persistence boundary for study plan definitions (title, steps, metadata). */
export interface StudyPlanCatalogPort {
  listPlans(): Promise<StudyPlan[]>
  getPlanById(planId: string): Promise<StudyPlan>
  createPlan(input: StudyPlanCreateInput): Promise<StudyPlan>
  updatePlan(planId: string, input: StudyPlanUpdateInput): Promise<StudyPlan>
  deletePlan(planId: string): Promise<void>
}
