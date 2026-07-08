import { createStudyPlanCatalogUseCases } from './studyPlanCatalogUseCases'
import { createStudyPlanSessionProgressUseCases } from './studyPlanSessionProgressUseCases'
import type { StudyPlanCatalogPort } from '../ports/StudyPlanCatalogPort'
import type { StudyPlanSessionProgressPort } from '../ports/StudyPlanSessionProgressPort'

export interface StudyPlanApplicationDeps {
  catalog: StudyPlanCatalogPort
  sessionProgress: StudyPlanSessionProgressPort
}

export function createStudyPlanApplication(deps: StudyPlanApplicationDeps) {
  return {
    catalog: createStudyPlanCatalogUseCases(deps.catalog),
    sessionProgress: createStudyPlanSessionProgressUseCases(
      deps.sessionProgress,
    ),
  }
}

export type StudyPlanApplication = ReturnType<typeof createStudyPlanApplication>
