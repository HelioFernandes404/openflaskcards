/**
 * FSRS v6 Default Parameters
 * Source: go-fsrs v4 `DefaultWeights()` (the algorithm actually used by apps/api)
 */
export const DEFAULT_FSRS_PARAMETERS: number[] = [
  0.212,
  1.2931,
  2.3065,
  8.2956, // w[0-3]: Initial stability for ratings 1-4
  6.4133,
  0.8334,
  3.0194, // w[4-6]: Difficulty dynamics
  0.001,
  1.8722,
  0.1666,
  0.796,
  1.4835, // w[7-11]: Stability increase (part 1)
  0.0614,
  0.2629,
  1.6483,
  0.6014,
  1.8729,
  0.5425,
  0.0912, // w[12-18]: Stability increase (part 2)
  0.0658,
  0.1542, // w[19]: short-term stability; w[20]: forgetting curve decay (must be > 0)
]

export interface Preset {
  name: string
  description: string
  retention: number
  params: number[]
  color: string
}

export const PRESETS: Record<string, Preset> = {
  relaxed: {
    name: 'Relaxed',
    description: 'Lower retention, less daily reviews',
    retention: 0.8,
    params: [...DEFAULT_FSRS_PARAMETERS],
    color: 'bg-blue-500',
  },
  balanced: {
    name: 'Balanced',
    description: 'Standard FSRS defaults (recommended)',
    retention: 0.9,
    params: [...DEFAULT_FSRS_PARAMETERS],
    color: 'bg-green-500',
  },
  intensive: {
    name: 'Intensive',
    description: 'High retention, maximum learning',
    retention: 0.95,
    params: [...DEFAULT_FSRS_PARAMETERS],
    color: 'bg-red-500',
  },
}
