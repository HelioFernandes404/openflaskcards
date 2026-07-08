/**
 * Chart / data-viz palette for FSRS card states.
 *
 * recharts and inline `style` need raw color strings (not Tailwind utilities),
 * so these mirror the DESIGN.md oklch support colors (same L/C, hue-only varies).
 * Keep in sync with the `success`/`warning`/`info` tokens in index.css.
 */
export const CARD_STATE_COLORS = {
  new: 'oklch(68% 0.13 240)', // info blue
  learning: 'oklch(68% 0.13 85)', // warning amber
  review: 'oklch(68% 0.13 145)', // success green
} as const
