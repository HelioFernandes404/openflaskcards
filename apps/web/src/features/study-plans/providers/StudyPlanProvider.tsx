import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { HttpStudyPlanCatalogAdapter } from '../adapters/api/HttpStudyPlanCatalogAdapter'
import { HttpStudyPlanSessionProgressAdapter } from '../adapters/api/HttpStudyPlanSessionProgressAdapter'
import {
  createStudyPlanApplication,
  type StudyPlanApplication,
  type StudyPlanApplicationDeps,
} from '../application/studyPlanApplication'

interface StudyPlanContextValue {
  application: StudyPlanApplication
}

const StudyPlanContext = createContext<StudyPlanContextValue | null>(null)

export interface StudyPlanProviderProps {
  children: ReactNode
  deps?: StudyPlanApplicationDeps
  application?: StudyPlanApplication
}

function createDefaultDeps(): StudyPlanApplicationDeps {
  return {
    catalog: new HttpStudyPlanCatalogAdapter(),
    sessionProgress: new HttpStudyPlanSessionProgressAdapter(),
  }
}

export function StudyPlanProvider({
  children,
  deps,
  application,
}: StudyPlanProviderProps) {
  const value = useMemo<StudyPlanContextValue>(() => {
    if (application) return { application }
    const resolvedDeps = deps ?? createDefaultDeps()
    return { application: createStudyPlanApplication(resolvedDeps) }
  }, [application, deps])

  return (
    <StudyPlanContext.Provider value={value}>
      {children}
    </StudyPlanContext.Provider>
  )
}

export function useStudyPlanApplication(): StudyPlanApplication {
  const context = useContext(StudyPlanContext)
  if (!context) {
    throw new Error(
      'useStudyPlanApplication must be used within StudyPlanProvider',
    )
  }
  return context.application
}
