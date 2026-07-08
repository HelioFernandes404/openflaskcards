import {
  toggleStepCompletion,
  type StudyPlanProgressRecord,
} from '../domain/studyPlanProgress'
import type { StudyPlanSessionProgressPort } from '../ports/StudyPlanSessionProgressPort'

export function createStudyPlanSessionProgressUseCases(
  sessionProgress: StudyPlanSessionProgressPort,
) {
  return {
    loadSessionProgress(planId: string): Promise<StudyPlanProgressRecord> {
      return sessionProgress.loadSessionProgress(planId)
    },

    saveSessionProgress(
      planId: string,
      record: StudyPlanProgressRecord,
    ): Promise<StudyPlanProgressRecord> {
      return sessionProgress.saveSessionProgress(planId, record)
    },

    async toggleDailyStep(
      planId: string,
      stepOrder: number,
      stepOrders: number[],
    ) {
      const record = await sessionProgress.loadSessionProgress(planId)
      const result = toggleStepCompletion(record, stepOrder, stepOrders)
      await sessionProgress.saveSessionProgress(planId, result.record)
      return result
    },
  }
}

export type StudyPlanSessionProgressUseCases = ReturnType<
  typeof createStudyPlanSessionProgressUseCases
>
