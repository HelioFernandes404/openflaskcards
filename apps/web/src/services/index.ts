// Service Layer exports - re-exporting from features
export type { IStudyService } from '@/features/study/services/StudyService'
export { ApiStudyService } from '@/features/study/services/ApiStudyService'
export { FakeStudyService } from '@/features/study/services/FakeStudyService'
export type { StudyPlanApplication } from '@/features/study-plans/application/studyPlanApplication'
export type { StudyPlanCatalogPort } from '@/features/study-plans/ports/StudyPlanCatalogPort'
export type { StudyPlanSessionProgressPort } from '@/features/study-plans/ports/StudyPlanSessionProgressPort'
