/**
 * FSRS forgetting curve — R(S) = 0.9 at t = S.
 * Default decay matches go-fsrs `DefaultWeights()[20]` (backend default),
 * not the fixed -0.5 used by older FSRS versions. Pass the user's real
 * `w[20]` as `decay` (negated) when available for an accurate curve.
 */
export const FSRS_DEFAULT_DECAY = -0.1542

function factorFor(decay: number): number {
  return 0.9 ** (1 / decay) - 1
}

export function retrievability(
  elapsedDays: number,
  stability: number,
  decay = FSRS_DEFAULT_DECAY,
): number {
  if (stability <= 0) return 0
  const factor = factorFor(decay)
  return (1 + (factor * elapsedDays) / stability) ** decay
}

export function daysUntilDue(
  stability: number,
  desiredRetention: number,
  decay = FSRS_DEFAULT_DECAY,
): number {
  if (stability <= 0 || desiredRetention <= 0 || desiredRetention > 1) return 0
  const factor = factorFor(decay)
  return (stability * (desiredRetention ** (1 / decay) - 1)) / factor
}

export function retentionCurve(
  stability: number,
  horizonDays: number,
  points = 80,
  decay = FSRS_DEFAULT_DECAY,
) {
  const step = horizonDays / points
  return Array.from({ length: points + 1 }, (_, i) => {
    const day = Math.round(i * step * 10) / 10
    const recall = retrievability(day, stability, decay)
    return {
      day,
      recall: Math.round(recall * 1000) / 10,
    }
  })
}
