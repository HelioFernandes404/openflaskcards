export interface FSRSParameterInfo {
  index: number
  label: string
  shortLabel: string
  description: string
  group:
    | 'initial-stability'
    | 'difficulty'
    | 'stability-growth'
    | 'lapse'
    | 'reserved'
}

export const FSRS_PARAMETER_GROUPS = {
  'initial-stability': {
    title: 'First review intervals',
    description:
      'How many days until the next review after your very first answer on a new card. Higher values space reviews further apart.',
  },
  difficulty: {
    title: 'Card difficulty',
    description:
      'How the algorithm estimates and adjusts how hard each card is for you, based on your ratings over time.',
  },
  'stability-growth': {
    title: 'Interval growth on success',
    description:
      'How quickly review intervals grow when you answer correctly. These fine-tune the algorithm — most users should not change them.',
  },
  lapse: {
    title: 'Recovery after forgetting',
    description:
      'What happens when you press Again. Controls how much the interval shrinks and how fast the card recovers.',
  },
  reserved: {
    title: 'Reserved parameters',
    description:
      'Internal FSRS weights. Leave at 0 unless you know what you are doing.',
  },
} as const

/** Human-readable metadata for all 21 FSRS weights (w[0]–w[20]). */
export const FSRS_PARAMETERS: FSRSParameterInfo[] = [
  {
    index: 0,
    label: 'Again — first interval',
    shortLabel: 'Again',
    description:
      'Days of stability after rating Again on a new card (~0.4 days default).',
    group: 'initial-stability',
  },
  {
    index: 1,
    label: 'Hard — first interval',
    shortLabel: 'Hard',
    description:
      'Days of stability after rating Hard on a new card (~1.2 days default).',
    group: 'initial-stability',
  },
  {
    index: 2,
    label: 'Good — first interval',
    shortLabel: 'Good',
    description:
      'Days of stability after rating Good on a new card (~3.2 days default).',
    group: 'initial-stability',
  },
  {
    index: 3,
    label: 'Easy — first interval',
    shortLabel: 'Easy',
    description:
      'Days of stability after rating Easy on a new card (~15.7 days default).',
    group: 'initial-stability',
  },
  {
    index: 4,
    label: 'Base difficulty',
    shortLabel: 'Base',
    description:
      'Starting difficulty assigned to new cards before any review history.',
    group: 'difficulty',
  },
  {
    index: 5,
    label: 'Rating impact',
    shortLabel: 'Rating',
    description:
      'How much each rating (Again/Hard/Good/Easy) shifts the card difficulty.',
    group: 'difficulty',
  },
  {
    index: 6,
    label: 'Difficulty drift',
    shortLabel: 'Drift',
    description:
      'How quickly difficulty returns toward the average over repeated reviews.',
    group: 'difficulty',
  },
  {
    index: 7,
    label: 'Growth baseline',
    shortLabel: 'Baseline',
    description:
      'Base multiplier applied when a review succeeds and stability increases.',
    group: 'stability-growth',
  },
  {
    index: 8,
    label: 'Difficulty factor',
    shortLabel: 'Diff ×1',
    description: 'How current card difficulty affects interval growth.',
    group: 'stability-growth',
  },
  {
    index: 9,
    label: 'Difficulty factor²',
    shortLabel: 'Diff ×2',
    description: 'Non-linear effect of difficulty on interval growth.',
    group: 'stability-growth',
  },
  {
    index: 10,
    label: 'Stability factor',
    shortLabel: 'Stab ×1',
    description: 'How existing stability affects the next interval increase.',
    group: 'stability-growth',
  },
  {
    index: 11,
    label: 'Stability factor²',
    shortLabel: 'Stab ×2',
    description: 'Non-linear effect of stability on interval growth.',
    group: 'stability-growth',
  },
  {
    index: 12,
    label: 'Retrievability factor',
    shortLabel: 'Ret ×1',
    description:
      'How memory strength at review time affects the interval increase.',
    group: 'stability-growth',
  },
  {
    index: 13,
    label: 'Retrievability factor²',
    shortLabel: 'Ret ×2',
    description: 'Non-linear effect of retrievability on interval growth.',
    group: 'stability-growth',
  },
  {
    index: 14,
    label: 'Rating bonus',
    shortLabel: 'Rating+',
    description:
      'Extra interval boost based on which button you pressed (Hard/Good/Easy).',
    group: 'stability-growth',
  },
  {
    index: 15,
    label: 'Lapse penalty',
    shortLabel: 'Penalty',
    description:
      'Base reduction applied to stability when you forget a card (Again).',
    group: 'lapse',
  },
  {
    index: 16,
    label: 'Lapse scaling',
    shortLabel: 'Scale',
    description:
      'How the lapse penalty scales with the card current stability.',
    group: 'lapse',
  },
  {
    index: 17,
    label: 'Lapse rating factor',
    shortLabel: 'Lapse rating',
    description: 'How the Again rating modulates the lapse penalty.',
    group: 'lapse',
  },
  {
    index: 18,
    label: 'Post-lapse recovery',
    shortLabel: 'Recovery',
    description: 'How fast stability rebuilds after a lapse during relearning.',
    group: 'lapse',
  },
  {
    index: 19,
    label: 'Short-term stability',
    shortLabel: 'w[19]',
    description:
      'Adjusts stability for same-day reviews. Leave at 0 unless you know what you are doing.',
    group: 'reserved',
  },
  {
    index: 20,
    label: 'Forgetting curve decay',
    shortLabel: 'w[20]',
    description:
      'Shapes how quickly memory fades over time. Must stay above 0 — the backend rejects 0 or negative values.',
    group: 'reserved',
  },
]

export const FSRS_WEIGHT_COUNT = FSRS_PARAMETERS.length

/** Pad or trim API weights to exactly 21 values. */
export function normalizeFSRSWeights(
  weights: number[] | undefined | null,
): number[] {
  const defaults = FSRS_PARAMETERS.map((_, i) => {
    if (
      weights &&
      i < weights.length &&
      weights[i] != null &&
      !Number.isNaN(weights[i])
    ) {
      return weights[i]
    }
    return 0
  })
  return defaults
}
