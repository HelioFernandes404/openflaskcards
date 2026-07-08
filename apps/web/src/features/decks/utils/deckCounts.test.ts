import { describe, expect, it } from 'vitest'
import { getDeckDueToday, getDeckTodayCounts } from './deckCounts'

describe('getDeckTodayCounts', () => {
  it('caps available new cards by the daily quota', () => {
    const counts = getDeckTodayCounts({
      newCount: 24,
      learnCount: 2,
      reviewCount: 5,
      newCardsStudiedToday: 0,
      newCardsDailyLimit: 10,
    })

    expect(counts.availableNewToday).toBe(10)
    expect(counts.remainingQuota).toBe(10)
  })

  it('respects new cards already studied today', () => {
    const counts = getDeckTodayCounts({
      newCount: 24,
      learnCount: 2,
      reviewCount: 0,
      newCardsStudiedToday: 8,
      newCardsDailyLimit: 10,
    })

    expect(counts.availableNewToday).toBe(2)
    expect(counts.remainingQuota).toBe(2)
  })
})

describe('getDeckDueToday', () => {
  it('sums quota-capped new, due learning, and due review cards', () => {
    expect(
      getDeckDueToday({
        newCount: 24,
        learnCount: 2,
        reviewCount: 5,
        newCardsStudiedToday: 0,
        newCardsDailyLimit: 10,
      }),
    ).toBe(17)
  })

  it('returns zero when nothing is due', () => {
    expect(
      getDeckDueToday({
        newCount: 0,
        learnCount: 0,
        reviewCount: 0,
        newCardsStudiedToday: 0,
        newCardsDailyLimit: 10,
      }),
    ).toBe(0)
  })
})
