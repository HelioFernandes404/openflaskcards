import { describe, expect, it } from 'vitest'
import { daysUntilDue, retrievability } from './fsrsRetrievability'

describe('fsrsRetrievability', () => {
  it('returns ~90% recall at t = stability', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 3)
  })

  it('returns 100% recall at t = 0', () => {
    expect(retrievability(0, 10)).toBeCloseTo(1, 6)
  })

  it('schedules review at stability for 90% target', () => {
    expect(daysUntilDue(10, 0.9)).toBeCloseTo(10, 2)
  })

  it('schedules earlier review for higher retention target', () => {
    expect(daysUntilDue(10, 0.95)).toBeLessThan(daysUntilDue(10, 0.9))
  })
})
