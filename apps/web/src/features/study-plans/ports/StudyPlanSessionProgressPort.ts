import type { StudyPlanProgressRecord } from '../domain/studyPlanProgress'

/** Persistence boundary for daily session progress (XP, streaks, completed steps). */
export interface StudyPlanSessionProgressPort {
  loadSessionProgress(planId: string): Promise<StudyPlanProgressRecord>
  saveSessionProgress(
    planId: string,
    record: StudyPlanProgressRecord,
  ): Promise<StudyPlanProgressRecord>
}
