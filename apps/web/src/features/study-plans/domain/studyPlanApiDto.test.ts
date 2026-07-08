import { describe, expect, it } from 'vitest'
import {
  mapProgressDtoToDomain,
  mapStudyPlanDtoToDomain,
} from './studyPlanApiDto'

describe('studyPlanApiDto', () => {
  it('maps malformed progress dto to empty domain record', () => {
    expect(mapProgressDtoToDomain(undefined)).toEqual({
      sessions: {},
      totalXp: 0,
      longestStreak: 0,
    })
  })

  it('maps study plan dto with nested progress', () => {
    const plan = mapStudyPlanDtoToDomain({
      id: 'plan-1',
      userId: 'user-1',
      title: 'English B1',
      level: 'B1',
      goal: 'work',
      goldenRule: 'step 1 first',
      flexibility: 'flex',
      noFixedDeadline: true,
      steps: [{ order: 1, activity: 'Flashcards', duration: '10m', notes: '' }],
      progress: {
        sessions: { '2026-07-02': [1] },
        totalXp: 10,
        longestStreak: 1,
      },
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-02T00:00:00Z',
    })

    expect(plan.progress.totalXp).toBe(10)
    expect(plan.progress.sessions['2026-07-02']).toEqual([1])
  })
})
