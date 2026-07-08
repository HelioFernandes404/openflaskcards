import { motion, AnimatePresence } from 'motion/react'
import type { HTMLMotionProps } from 'motion/react'
import { forwardRef } from 'react'

import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  fadeInUp,
  fadeIn,
  fadeInScale,
  pageVariants,
  listContainerVariants,
  listItemVariants,
  modalOverlayVariants,
  modalContentVariants,
  reducedMotionVariants,
  transitions,
} from '../utils/motion'
import { cn } from '../utils'

// ============================================================================
// PAGE TRANSITION
// ============================================================================

interface AnimatedPageProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
}

/**
 * Page shell with a fade-in entrance animation.
 * Respects the user's reduced-motion preference.
 */
export const AnimatedPage = forwardRef<HTMLDivElement, AnimatedPageProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    return (
      <motion.div
        ref={ref}
        variants={reducedMotion ? reducedMotionVariants : pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
AnimatedPage.displayName = 'AnimatedPage'

// ============================================================================
// FADE IN
// ============================================================================

interface MotionFadeProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  /** Animation type */
  type?: 'fade' | 'fadeUp' | 'fadeScale'
  /** Delay before animation starts (seconds) */
  delay?: number
}

/**
 * Simple fade-in wrapper with optional variants.
 */
export const MotionFade = forwardRef<HTMLDivElement, MotionFadeProps>(
  ({ children, className, type = 'fadeUp', delay = 0, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    const variantMap = {
      fade: fadeIn,
      fadeUp: fadeInUp,
      fadeScale: fadeInScale,
    }

    return (
      <motion.div
        ref={ref}
        variants={reducedMotion ? reducedMotionVariants : variantMap[type]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ ...transitions.normal, delay }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
MotionFade.displayName = 'MotionFade'

// ============================================================================
// LIST WITH STAGGER
// ============================================================================

interface MotionListProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
}

/**
 * Container for staggered list animations.
 * Wrap list items with MotionListItem for the stagger effect.
 */
export const MotionList = forwardRef<HTMLDivElement, MotionListProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    return (
      <motion.div
        ref={ref}
        variants={reducedMotion ? reducedMotionVariants : listContainerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
MotionList.displayName = 'MotionList'

interface MotionListItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
}

/**
 * Individual item in a staggered list.
 * Must be a child of MotionList for stagger to work.
 */
export const MotionListItem = forwardRef<HTMLDivElement, MotionListItemProps>(
  ({ children, className, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    return (
      <motion.div
        ref={ref}
        variants={reducedMotion ? reducedMotionVariants : listItemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
MotionListItem.displayName = 'MotionListItem'

// ============================================================================
// MODAL/DIALOG
// ============================================================================

interface MotionModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
}

/**
 * Animated modal wrapper with backdrop.
 * Uses AnimatePresence for exit animations.
 */
export function MotionModal({
  isOpen,
  onClose,
  children,
  className,
  overlayClassName,
}: MotionModalProps) {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={
              reducedMotion ? reducedMotionVariants : modalOverlayVariants
            }
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.fast}
            className={cn('absolute inset-0 bg-overlay', overlayClassName)}
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            variants={
              reducedMotion ? reducedMotionVariants : modalContentVariants
            }
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn('relative z-10', className)}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// CARD WITH HOVER
// ============================================================================

interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  /** Enable hover lift effect */
  hover?: boolean
}

/**
 * Card wrapper with optional hover animation.
 */
export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className, hover = true, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    if (reducedMotion || !hover) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        whileHover={{ y: -4 }}
        whileTap={{ y: 0 }}
        transition={transitions.fast}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
MotionCard.displayName = 'MotionCard'
