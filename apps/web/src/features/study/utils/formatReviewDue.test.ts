import { describe, expect, it } from 'vitest'
import { formatReviewDueDate, formatReviewDueDisplay } from './formatReviewDue'

describe('formatReviewDueDisplay', () => {
  const now = new Date(2026, 5, 26, 13, 0, 0)

  it('shows a full weekday date and time for same-day reviews', () => {
    const due = new Date(2026, 5, 26, 13, 7, 0).toISOString()
    const display = formatReviewDueDisplay(due, now)
    expect(display?.dateLabel).toMatch(/26/)
    expect(display?.dateLabel).toMatch(/June|junho/i)
    expect(display?.timeLabel).toMatch(/13:07|1:07 PM/i)
  })

  it('shows a full weekday date for tomorrow', () => {
    const due = new Date(2026, 5, 27, 9, 30, 0).toISOString()
    const display = formatReviewDueDisplay(due, now)
    expect(display?.dateLabel).toMatch(/27/)
    expect(display?.timeLabel).toMatch(/9:30|09:30/i)
  })

  it('shows a full weekday date for later reviews', () => {
    const due = new Date(2026, 7, 26, 13, 0, 0).toISOString()
    const display = formatReviewDueDisplay(due, now)
    expect(display?.dateLabel).toMatch(/26/)
    expect(display?.dateLabel).toMatch(/August|agosto/i)
    expect(display?.timeLabel).toMatch(/13:00|1:00 PM/i)
  })

  it('returns null for invalid dates', () => {
    expect(formatReviewDueDisplay('not-a-date', now)).toBeNull()
  })
})

describe('formatReviewDueDate', () => {
  const now = new Date(2026, 5, 26, 13, 0, 0)

  it('returns a full verbal datetime string', () => {
    const due = new Date(2026, 7, 26, 13, 0, 0).toISOString()
    const formatted = formatReviewDueDate(due, now)
    expect(formatted).toMatch(/26/)
    expect(formatted).toMatch(/August|agosto/i)
    expect(formatted).toMatch(/13:00|1:00 PM/i)
  })

  it('returns em dash for invalid dates', () => {
    expect(formatReviewDueDate('not-a-date', now)).toBe('—')
  })
})
