import type { StudyPlanProgressRecord } from './studyPlanProgress'

export interface StudyPlanStep {
  order: number
  activity: string
  duration: string
  notes: string
}

export interface StudyPlan {
  id: string
  userId: string
  title: string
  level: string
  goal: string
  goldenRule: string
  flexibility: string
  noFixedDeadline: boolean
  steps: StudyPlanStep[]
  progress: StudyPlanProgressRecord
  createdAt: string
  updatedAt: string
}

export interface StudyPlanCreateInput {
  title: string
  level?: string
  goal?: string
  goldenRule?: string
  flexibility?: string
  noFixedDeadline?: boolean
  steps?: StudyPlanStep[]
}

export interface StudyPlanUpdateInput {
  title?: string
  level?: string
  goal?: string
  goldenRule?: string
  flexibility?: string
  noFixedDeadline?: boolean
  steps?: StudyPlanStep[]
}
