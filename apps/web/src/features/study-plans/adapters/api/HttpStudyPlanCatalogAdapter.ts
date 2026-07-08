import { mapStudyPlanDtoToDomain } from '../../domain/studyPlanApiDto'
import type {
  StudyPlan,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from '../../domain/studyPlan'
import type { StudyPlanCatalogPort } from '../../ports/StudyPlanCatalogPort'
import { studyPlanHttpClient } from './studyPlanHttpClient'

export class HttpStudyPlanCatalogAdapter implements StudyPlanCatalogPort {
  async listPlans(): Promise<StudyPlan[]> {
    const dtos = await studyPlanHttpClient.listPlans()
    return dtos.map(mapStudyPlanDtoToDomain)
  }

  async getPlanById(planId: string): Promise<StudyPlan> {
    return mapStudyPlanDtoToDomain(
      await studyPlanHttpClient.getPlanById(planId),
    )
  }

  async createPlan(input: StudyPlanCreateInput): Promise<StudyPlan> {
    return mapStudyPlanDtoToDomain(await studyPlanHttpClient.createPlan(input))
  }

  async updatePlan(
    planId: string,
    input: StudyPlanUpdateInput,
  ): Promise<StudyPlan> {
    return mapStudyPlanDtoToDomain(
      await studyPlanHttpClient.updatePlan(planId, input),
    )
  }

  async deletePlan(planId: string): Promise<void> {
    await studyPlanHttpClient.deletePlan(planId)
  }
}
