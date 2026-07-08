export type ReviewRating = 1 | 2 | 3 | 4

export const RATING_ANIMATION_MS = 280

export interface StudySessionReviewRecord {
  cardId: string
  rating: ReviewRating
  durationMs: number
}

export interface StudySessionStats {
  reviews: StudySessionReviewRecord[]
  combo: number
  maxCombo: number
}

export interface StudySessionSummary {
  totalCards: number
  timerSeconds: number
  againCount: number
  hardCount: number
  goodCount: number
  easyCount: number
  successRate: number
  maxCombo: number
  fastestMs: number | null
  slowestMs: number | null
  clearedQueue: boolean
}

export interface StoredSessionSnapshot {
  deckId: string
  totalCards: number
  timerSeconds: number
  successRate: number
  maxCombo: number
  finishedAt: string
}

export interface RetrievabilityLevel {
  label: string
  tone: 'fresh' | 'stable' | 'risk'
  percent: number
}

export interface RatingExitMotion {
  x: number
  y: number
  tone: 'danger' | 'neutral' | 'success'
}

export const COMBO_MILESTONES = new Set<number>([3, 5, 10])

const RATING_EXIT_MOTIONS: Record<ReviewRating, RatingExitMotion> = {
  1: { x: -120, y: 0, tone: 'danger' },
  2: { x: 0, y: 80, tone: 'neutral' },
  3: { x: 0, y: -80, tone: 'success' },
  4: { x: 120, y: 0, tone: 'success' },
}

export function isComboBuildingRating(rating: ReviewRating): boolean {
  return rating === 3 || rating === 4
}

export function updateComboStreak(
  combo: number,
  rating: ReviewRating,
): { combo: number; milestone: number | null } {
  const nextCombo = isComboBuildingRating(rating) ? combo + 1 : 0
  const milestone = COMBO_MILESTONES.has(nextCombo) ? nextCombo : null

  return { combo: nextCombo, milestone }
}

export function appendReview(
  stats: StudySessionStats,
  record: StudySessionReviewRecord,
): { stats: StudySessionStats; milestone: number | null } {
  const { combo, milestone } = updateComboStreak(stats.combo, record.rating)

  return {
    stats: {
      reviews: [...stats.reviews, record],
      combo,
      maxCombo: Math.max(stats.maxCombo, combo),
    },
    milestone,
  }
}

export function createEmptySessionStats(): StudySessionStats {
  return { reviews: [], combo: 0, maxCombo: 0 }
}

export function buildSessionSummary(
  stats: StudySessionStats,
  timerSeconds: number,
  totalCards: number,
): StudySessionSummary {
  let againCount = 0
  let hardCount = 0
  let goodCount = 0
  let easyCount = 0
  let fastestMs: number | null = null
  let slowestMs: number | null = null

  for (const review of stats.reviews) {
    if (review.rating === 1) againCount++
    else if (review.rating === 2) hardCount++
    else if (review.rating === 3) goodCount++
    else easyCount++

    fastestMs =
      fastestMs === null
        ? review.durationMs
        : Math.min(fastestMs, review.durationMs)
    slowestMs =
      slowestMs === null
        ? review.durationMs
        : Math.max(slowestMs, review.durationMs)
  }

  const successCount = goodCount + easyCount

  return {
    totalCards,
    timerSeconds,
    againCount,
    hardCount,
    goodCount,
    easyCount,
    successRate:
      stats.reviews.length === 0
        ? 0
        : Math.round((successCount / stats.reviews.length) * 100),
    maxCombo: stats.maxCombo,
    fastestMs,
    slowestMs,
    clearedQueue: stats.reviews.length === totalCards && totalCards > 0,
  }
}

export function getRetrievabilityLevel(
  retrievability: number,
): RetrievabilityLevel {
  const percent = Math.round(Math.min(1, Math.max(0, retrievability)) * 100)

  if (retrievability >= 0.9) {
    return { label: 'Fresh', tone: 'fresh', percent }
  }
  if (retrievability >= 0.7) {
    return { label: 'Stable', tone: 'stable', percent }
  }
  return { label: 'At risk', tone: 'risk', percent }
}

export function getRatingExitMotion(rating: ReviewRating): RatingExitMotion {
  return RATING_EXIT_MOTIONS[rating]
}

export function formatStudyTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatHumanDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${remainder}s`
}

export function formatDurationMs(durationMs: number): string {
  return formatHumanDuration(Math.round(durationMs / 1000))
}

export function compareWithPreviousSession(
  current: StudySessionSummary,
  previous: StoredSessionSnapshot | null,
): string | null {
  if (!previous) return null

  const timeDelta = current.timerSeconds - previous.timerSeconds
  const successDelta = current.successRate - previous.successRate

  if (timeDelta < 0 && successDelta >= 0) {
    return `Faster than last time (${formatHumanDuration(Math.abs(timeDelta))}) with equal or better accuracy.`
  }
  if (successDelta > 0) {
    return `${successDelta}% more Good/Easy than your last session.`
  }
  if (timeDelta < 0) {
    return `Finished ${formatHumanDuration(Math.abs(timeDelta))} faster than last time.`
  }

  return null
}
