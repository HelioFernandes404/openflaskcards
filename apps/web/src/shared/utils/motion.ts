import type { Variants, Transition } from 'motion/react'

/**
 * Motion presets for consistent animations across the app.
 * All animations respect prefers-reduced-motion via the useReducedMotion hook.
 */

// ============================================================================
// TOKENS
// ============================================================================

export const durations = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  page: 0.25,
} as const

export const easings = {
  /** Smooth ease-out for entrances */
  easeOut: [0.25, 0.1, 0.25, 1] as const,
  /** Snappy spring-like feel */
  easeOutBack: [0.34, 1.56, 0.64, 1] as const,
  /** Linear for simple fades */
  linear: [0, 0, 1, 1] as const,
  /** Natural deceleration */
  decelerate: [0, 0, 0.2, 1] as const,
}

export const distances = {
  sm: 8,
  md: 12,
  lg: 20,
} as const

export const staggerDelays = {
  fast: 0.03,
  normal: 0.04,
  slow: 0.06,
} as const

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  fast: {
    duration: durations.fast,
    ease: easings.easeOut,
  } as Transition,
  normal: {
    duration: durations.normal,
    ease: easings.easeOut,
  } as Transition,
  slow: {
    duration: durations.slow,
    ease: easings.easeOut,
  } as Transition,
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  } as Transition,
  springBouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  } as Transition,
}

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Fade in/out with optional Y translation
 */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: distances.sm },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -distances.sm },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: distances.md },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.page,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -distances.sm,
    transition: {
      duration: durations.fast,
      ease: easings.linear,
    },
  },
}

/**
 * List container variant with stagger effect
 */
export const listContainerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelays.normal,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0 },
}

/**
 * List item variant (use with listContainerVariants)
 */
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: distances.sm },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -distances.sm,
    transition: transitions.fast,
  },
}

/**
 * Modal/dialog variants
 */
export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: distances.md },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: distances.sm,
    transition: {
      duration: durations.fast,
    },
  },
}

/**
 * Card hover variants for interactive cards
 */
export const cardHoverVariants: Variants = {
  initial: { y: 0 },
  hover: {
    y: -4,
    transition: transitions.fast,
  },
  tap: {
    y: 0,
    transition: transitions.fast,
  },
}

/**
 * Expand/collapse variants (accordion, details, etc)
 */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: durations.normal, ease: easings.easeOut },
      opacity: { duration: durations.fast, delay: 0.05 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: durations.fast, ease: easings.linear },
      opacity: { duration: durations.fast },
    },
  },
}

/**
 * Slide in from side (drawer, sidebar, etc)
 */
export const slideInFromRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: transitions.normal,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: transitions.fast,
  },
}

export const slideInFromLeft: Variants = {
  initial: { x: '-100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: transitions.normal,
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: transitions.fast,
  },
}

/**
 * Browse Cards three-pane layout — subtle directional entrance
 */
export const browseSidebarVariants: Variants = {
  initial: { opacity: 0, x: -distances.md },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.slow,
      ease: easings.decelerate,
    },
  },
}

export const browseTableVariants: Variants = {
  initial: { opacity: 0, y: distances.sm },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easings.decelerate,
      delay: 0.05,
    },
  },
}

export const browseEditorVariants: Variants = {
  initial: { opacity: 0, x: distances.md },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.slow,
      ease: easings.decelerate,
      delay: 0.1,
    },
  },
}

// ============================================================================
// REDUCED MOTION VARIANTS
// ============================================================================

/**
 * No-motion variants for users with prefers-reduced-motion
 */
export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create stagger delay for a specific index
 */
export function staggerDelay(
  index: number,
  delay: keyof typeof staggerDelays = 'normal',
): number {
  return index * staggerDelays[delay]
}

/**
 * Get variants based on reduced motion preference
 */
export function getVariants(
  variants: Variants,
  reducedMotion: boolean,
): Variants {
  return reducedMotion ? reducedMotionVariants : variants
}
