import type { StudyPlanProgressRecord } from '../../domain/studyPlanProgress'
import type { StudyPlanSessionProgressPort } from '../../ports/StudyPlanSessionProgressPort'
import type { InMemoryStudyPlanDatabase } from './InMemoryStudyPlanDatabase'

export class InMemoryStudyPlanSessionProgressAdapter
  implements StudyPlanSessionProgressPort
{
  private readonly database: InMemoryStudyPlanDatabase

  constructor(database: InMemoryStudyPlanDatabase) {
    this.database = database
  }

  async loadSessionProgress(planId: string): Promise<StudyPlanProgressRecord> {
    this.database.requirePlan(planId)
    return this.database.sessionProgressFor(planId)
  }

  async saveSessionProgress(
    planId: string,
    record: StudyPlanProgressRecord,
  ): Promise<StudyPlanProgressRecord> {
    this.database.requirePlan(planId)
    this.database.sessionProgressByPlanId[planId] = record
    return record
  }
}
