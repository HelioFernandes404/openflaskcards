import type {
  StudyPlan,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from '../domain/studyPlan'
import type { StudyPlanCatalogPort } from '../ports/StudyPlanCatalogPort'

export function createStudyPlanCatalogUseCases(catalog: StudyPlanCatalogPort) {
  return {
    listPlans(): Promise<StudyPlan[]> {
      return catalog.listPlans()
    },

    getPlanById(planId: string): Promise<StudyPlan> {
      return catalog.getPlanById(planId)
    },

    createPlan(input: StudyPlanCreateInput): Promise<StudyPlan> {
      return catalog.createPlan(input)
    },

    updatePlan(
      planId: string,
      input: StudyPlanUpdateInput,
    ): Promise<StudyPlan> {
      return catalog.updatePlan(planId, input)
    },

    deletePlan(planId: string): Promise<void> {
      return catalog.deletePlan(planId)
    },
  }
}

export type StudyPlanCatalogUseCases = ReturnType<
  typeof createStudyPlanCatalogUseCases
>
