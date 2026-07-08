import { mapProgressDtoToDomain } from '../../domain/studyPlanApiDto'
import type { StudyPlanProgressRecord } from '../../domain/studyPlanProgress'
import type { StudyPlanSessionProgressPort } from '../../ports/StudyPlanSessionProgressPort'
import { studyPlanHttpClient } from './studyPlanHttpClient'

export class HttpStudyPlanSessionProgressAdapter
  implements StudyPlanSessionProgressPort
{
  async loadSessionProgress(planId: string): Promise<StudyPlanProgressRecord> {
    return mapProgressDtoToDomain(
      await studyPlanHttpClient.loadSessionProgress(planId),
    )
  }

  async saveSessionProgress(
    planId: string,
    record: StudyPlanProgressRecord,
  ): Promise<StudyPlanProgressRecord> {
    return mapProgressDtoToDomain(
      await studyPlanHttpClient.saveSessionProgress(planId, record),
    )
  }
}
