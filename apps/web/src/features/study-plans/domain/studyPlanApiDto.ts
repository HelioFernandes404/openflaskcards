import {
  createEmptyProgressRecord,
  type StudyPlanProgressRecord,
} from './studyPlanProgress'
import type {
  StudyPlan,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from './studyPlan'

export interface StudyPlanProgressDto {
  sessions?: Record<string, number[]>
  totalXp?: number
  longestStreak?: number
}

export interface StudyPlanDto {
  id: string
  userId: string
  title: string
  level: string
  goal: string
  goldenRule: string
  flexibility: string
  noFixedDeadline: boolean
  steps: StudyPlan['steps']
  progress?: StudyPlanProgressDto
  createdAt: string
  updatedAt: string
}

export function mapProgressDtoToDomain(
  raw?: StudyPlanProgressDto | null,
): StudyPlanProgressRecord {
  if (!raw || typeof raw !== 'object') return createEmptyProgressRecord()
  return {
    sessions:
      raw.sessions && typeof raw.sessions === 'object' ? raw.sessions : {},
    totalXp: typeof raw.totalXp === 'number' ? Math.max(0, raw.totalXp) : 0,
    longestStreak:
      typeof raw.longestStreak === 'number'
        ? Math.max(0, raw.longestStreak)
        : 0,
  }
}

export function mapStudyPlanDtoToDomain(dto: StudyPlanDto): StudyPlan {
  return {
    ...dto,
    progress: mapProgressDtoToDomain(dto.progress),
  }
}

export function mapCreatePlanInputToPayload(input: StudyPlanCreateInput) {
  return {
    title: input.title,
    level: input.level ?? '',
    goal: input.goal ?? '',
    goldenRule: input.goldenRule ?? '',
    flexibility: input.flexibility ?? '',
    noFixedDeadline: input.noFixedDeadline ?? true,
    steps: input.steps ?? [],
  }
}

export function mapUpdatePlanInputToPayload(
  input: StudyPlanUpdateInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.level !== undefined) payload.level = input.level
  if (input.goal !== undefined) payload.goal = input.goal
  if (input.goldenRule !== undefined) payload.goldenRule = input.goldenRule
  if (input.flexibility !== undefined) payload.flexibility = input.flexibility
  if (input.noFixedDeadline !== undefined) {
    payload.noFixedDeadline = input.noFixedDeadline
  }
  if (input.steps !== undefined) payload.steps = input.steps
  return payload
}
