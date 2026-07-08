import { describe, expect, it } from 'vitest'
import {
  computeLongestStreak,
  computeStreak,
  createEmptyProgressRecord,
  FULL_SESSION_BONUS_XP,
  getDailyProgress,
  getDayStatus,
  getFirstStepOrder,
  getStudyPlanLevel,
  getTodayDateKey,
  getWeekSummary,
  STEP_XP,
  toggleStepCompletion,
} from './studyPlanProgress'
import { inferStepAction, parseDurationMinutes } from './studyPlanStepActions'
import type { StudyPlanStep } from '../types/studyPlan'

const STEPS = [1, 2, 3, 4, 5]
const TODAY = '2026-07-01'

describe('studyPlanProgress', () => {
  it('counts a daily win when the first step is completed', () => {
    const record = {
      ...createEmptyProgressRecord(),
      sessions: { [TODAY]: [1] },
    }

    const daily = getDailyProgress(record, STEPS, TODAY)
    expect(daily.hasDailyWin).toBe(true)
    expect(daily.isFullSession).toBe(false)
    expect(daily.completedCount).toBe(1)
  })

  it('awards XP per step and a bonus for a full session', () => {
    let record = createEmptyProgressRecord()

    const first = toggleStepCompletion(record, 1, STEPS, TODAY)
    record = first.record
    expect(first.gainedXp).toBe(STEP_XP)
    expect(first.reachedDailyWin).toBe(true)

    for (const order of [2, 3, 4]) {
      record = toggleStepCompletion(record, order, STEPS, TODAY).record
    }

    const full = toggleStepCompletion(record, 5, STEPS, TODAY)
    expect(full.gainedXp).toBe(STEP_XP + FULL_SESSION_BONUS_XP)
    expect(full.reachedFullSession).toBe(true)
    expect(getDailyProgress(full.record, STEPS, TODAY).xpEarnedToday).toBe(
      STEPS.length * STEP_XP + FULL_SESSION_BONUS_XP,
    )
  })

  it('computes streaks across consecutive winning days', () => {
    const record = {
      ...createEmptyProgressRecord(),
      sessions: {
        '2026-06-29': [1],
        '2026-06-30': [1, 2],
        [TODAY]: [1],
      },
    }

    expect(
      computeStreak(record.sessions, getFirstStepOrder(STEPS), TODAY),
    ).toBe(3)
    expect(
      computeLongestStreak(record.sessions, getFirstStepOrder(STEPS)),
    ).toBe(3)
  })

  it('keeps streak alive through today when yesterday was a win', () => {
    const record = {
      ...createEmptyProgressRecord(),
      sessions: {
        '2026-06-30': [1],
      },
    }

    expect(
      computeStreak(record.sessions, getFirstStepOrder(STEPS), TODAY),
    ).toBe(1)
  })

  it('removes XP when a step is unchecked', () => {
    const completed = toggleStepCompletion(
      createEmptyProgressRecord(),
      1,
      STEPS,
      TODAY,
    )
    const undone = toggleStepCompletion(completed.record, 1, STEPS, TODAY)

    expect(undone.gainedXp).toBe(-STEP_XP)
    expect(undone.record.totalXp).toBe(0)
    expect(getDailyProgress(undone.record, STEPS, TODAY).hasDailyWin).toBe(
      false,
    )
  })

  it('formats today as YYYY-MM-DD', () => {
    expect(getTodayDateKey(new Date(2026, 6, 1))).toBe('2026-07-01')
  })

  it('classifies day status', () => {
    expect(getDayStatus([1], 1, 5)).toBe('win')
    expect(getDayStatus([1, 2, 3, 4, 5], 1, 5)).toBe('full')
    expect(getDayStatus([2], 1, 5)).toBe('none')
  })

  it('builds a 7-day summary ending today', () => {
    const record = {
      ...createEmptyProgressRecord(),
      sessions: {
        '2026-06-30': [1],
        [TODAY]: [1, 2, 3, 4, 5],
      },
    }

    const week = getWeekSummary(record, STEPS, TODAY)
    expect(week).toHaveLength(7)
    expect(week.at(-1)?.dateKey).toBe(TODAY)
    expect(week.at(-1)?.status).toBe('full')
    expect(week.at(-2)?.status).toBe('win')
  })

  it('maps XP to themed levels', () => {
    expect(getStudyPlanLevel(0).title).toBe('Warm-up')
    expect(getStudyPlanLevel(175).level).toBe(3)
    expect(getStudyPlanLevel(900).level).toBe(6)
    expect(getStudyPlanLevel(900).xpForNextLevel).toBeNull()
  })
})

describe('studyPlanStepActions', () => {
  const flashcards: StudyPlanStep = {
    order: 1,
    activity: 'Flashcards (spaced review)',
    duration: '10-15 min',
    notes: 'sempre primeiro',
  }

  it('infers flashcards, writing, and speaking actions', () => {
    expect(inferStepAction(flashcards).type).toBe('flashcards')
    expect(
      inferStepAction({
        order: 3,
        activity: 'Escrita com prompt',
        duration: '15 min',
        notes: '',
      }).type,
    ).toBe('writing')
    expect(
      inferStepAction({
        order: 5,
        activity: 'Falar / Shadowing',
        duration: '5-15 min',
        notes: '',
      }).usesTimer,
    ).toBe(true)
  })

  it('parses duration strings', () => {
    expect(parseDurationMinutes('10-15 min')).toBe(10)
    expect(parseDurationMinutes('')).toBeNull()
  })
})
