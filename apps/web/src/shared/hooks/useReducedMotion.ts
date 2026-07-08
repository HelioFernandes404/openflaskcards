import { useReducedMotion as useFramerReducedMotion } from 'motion/react'

/**
 * Hook to detect if the user prefers reduced motion.
 *
 * Uses framer-motion's built-in hook which listens to the
 * `prefers-reduced-motion: reduce` media query.
 *
 * @returns boolean - true if user prefers reduced motion
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 *
 * return (
 *   <motion.div
 *     variants={prefersReducedMotion ? reducedMotionVariants : fadeInUp}
 *     initial="initial"
 *     animate="animate"
 *   >
 *     Content
 *   </motion.div>
 * )
 * ```
 */
export function useReducedMotion(): boolean {
  const shouldReduceMotion = useFramerReducedMotion()
  return shouldReduceMotion ?? false
}
