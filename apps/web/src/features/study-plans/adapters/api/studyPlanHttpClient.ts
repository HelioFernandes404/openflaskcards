import { httpClient } from '@/shared/services/apiClient'
import type {
  StudyPlanDto,
  StudyPlanProgressDto,
} from '../../domain/studyPlanApiDto'
import type {
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from '../../domain/studyPlan'
import {
  mapCreatePlanInputToPayload,
  mapUpdatePlanInputToPayload,
} from '../../domain/studyPlanApiDto'

export const studyPlanHttpClient = {
  listPlans(): Promise<StudyPlanDto[]> {
    return httpClient
      .get<StudyPlanDto[]>('/study-plans')
      .then(({ data }) => data)
  },

  getPlanById(planId: string): Promise<StudyPlanDto> {
    return httpClient
      .get<StudyPlanDto>(`/study-plans/${planId}`)
      .then(({ data }) => data)
  },

  createPlan(input: StudyPlanCreateInput): Promise<StudyPlanDto> {
    return httpClient
      .post<StudyPlanDto>('/study-plans', mapCreatePlanInputToPayload(input))
      .then(({ data }) => data)
  },

  updatePlan(
    planId: string,
    input: StudyPlanUpdateInput,
  ): Promise<StudyPlanDto> {
    return httpClient
      .put<StudyPlanDto>(
        `/study-plans/${planId}`,
        mapUpdatePlanInputToPayload(input),
      )
      .then(({ data }) => data)
  },

  deletePlan(planId: string): Promise<void> {
    return httpClient.delete(`/study-plans/${planId}`).then(() => undefined)
  },

  loadSessionProgress(planId: string): Promise<StudyPlanProgressDto> {
    return httpClient
      .get<StudyPlanProgressDto>(`/study-plans/${planId}/progress`)
      .then(({ data }) => data)
  },

  saveSessionProgress(
    planId: string,
    record: StudyPlanProgressDto,
  ): Promise<StudyPlanProgressDto> {
    return httpClient
      .put<StudyPlanProgressDto>(`/study-plans/${planId}/progress`, record)
      .then(({ data }) => data)
  },
}
