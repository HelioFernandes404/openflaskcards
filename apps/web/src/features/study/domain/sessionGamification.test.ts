import { describe, expect, it } from 'vitest'
import {
  appendReview,
  buildSessionSummary,
  compareWithPreviousSession,
  createEmptySessionStats,
  formatStudyTimer,
  getRatingExitMotion,
  getRetrievabilityLevel,
  updateComboStreak,
} from './sessionGamification'

describe('updateComboStreak', () => {
  it('increments combo on Good or Easy', () => {
    expect(updateComboStreak(2, 3)).toEqual({ combo: 3, milestone: 3 })
    expect(updateComboStreak(3, 4)).toEqual({ combo: 4, milestone: null })
  })

  it('resets combo on Again or Hard', () => {
    expect(updateComboStreak(5, 1)).toEqual({ combo: 0, milestone: null })
    expect(updateComboStreak(5, 2)).toEqual({ combo: 0, milestone: null })
  })
})

describe('buildSessionSummary', () => {
  it('aggregates ratings, timing, and queue completion', () => {
    let stats = createEmptySessionStats()
    const first = appendReview(stats, {
      cardId: 'a',
      rating: 4,
      durationMs: 5000,
    })
    stats = first.stats
    const second = appendReview(stats, {
      cardId: 'b',
      rating: 1,
      durationMs: 12000,
    })
    stats = second.stats
    const third = appendReview(stats, {
      cardId: 'c',
      rating: 3,
      durationMs: 8000,
    })
    stats = third.stats

    const summary = buildSessionSummary(stats, 95, 3)

    expect(summary).toMatchObject({
      totalCards: 3,
      timerSeconds: 95,
      againCount: 1,
      hardCount: 0,
      goodCount: 1,
      easyCount: 1,
      successRate: 67,
      maxCombo: 1,
      fastestMs: 5000,
      slowestMs: 12000,
      clearedQueue: true,
    })
  })
})

describe('getRetrievabilityLevel', () => {
  it('maps retrievability into memory energy bands', () => {
    expect(getRetrievabilityLevel(0.95)).toMatchObject({
      label: 'Fresh',
      tone: 'fresh',
      percent: 95,
    })
    expect(getRetrievabilityLevel(0.8)).toMatchObject({
      label: 'Stable',
      tone: 'stable',
    })
    expect(getRetrievabilityLevel(0.4)).toMatchObject({
      label: 'At risk',
      tone: 'risk',
    })
  })
})

describe('getRatingExitMotion', () => {
  it('maps ratings to directional exit vectors', () => {
    expect(getRatingExitMotion(1)).toMatchObject({ x: -120, tone: 'danger' })
    expect(getRatingExitMotion(2)).toMatchObject({ y: 80, tone: 'neutral' })
    expect(getRatingExitMotion(3)).toMatchObject({ y: -80, tone: 'success' })
    expect(getRatingExitMotion(4)).toMatchObject({ x: 120, tone: 'success' })
  })
})

describe('formatStudyTimer', () => {
  it('formats seconds as m:ss', () => {
    expect(formatStudyTimer(0)).toBe('0:00')
    expect(formatStudyTimer(65)).toBe('1:05')
    expect(formatStudyTimer(600)).toBe('10:00')
  })
})

describe('compareWithPreviousSession', () => {
  it('returns null when there is no previous snapshot', () => {
    expect(
      compareWithPreviousSession(
        buildSessionSummary(createEmptySessionStats(), 60, 0),
        null,
      ),
    ).toBeNull()
  })

  it('highlights better accuracy versus the previous session', () => {
    const current = buildSessionSummary(
      {
        reviews: [
          { cardId: 'a', rating: 4, durationMs: 1000 },
          { cardId: 'b', rating: 3, durationMs: 1000 },
        ],
        combo: 2,
        maxCombo: 2,
      },
      60,
      2,
    )

    expect(
      compareWithPreviousSession(current, {
        deckId: 'deck-1',
        totalCards: 2,
        timerSeconds: 60,
        successRate: 50,
        maxCombo: 1,
        finishedAt: '2024-01-01T00:00:00Z',
      }),
    ).toContain('more Good/Easy')
  })
})
