export interface ReviewDueDisplay {
  /** Verbal date label, e.g. "Friday, June 26, 2026". */
  dateLabel: string
  /** Localized time, e.g. "1:07 PM". */
  timeLabel: string
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Verbal next-review date/time for rating buttons (locale-aware). */
export function formatReviewDueDisplay(
  isoDue: string,
  now = new Date(),
): ReviewDueDisplay | null {
  const due = new Date(isoDue)
  if (Number.isNaN(due.getTime())) return null

  return {
    dateLabel: due.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(due.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    }),
    timeLabel: formatTime(due),
  }
}

/** Single-line verbal datetime for tooltips and aria labels. */
export function formatReviewDueDate(isoDue: string, now = new Date()): string {
  const due = new Date(isoDue)
  if (Number.isNaN(due.getTime())) return '—'

  return due.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}
