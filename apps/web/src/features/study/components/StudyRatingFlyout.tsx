import { motion } from 'motion/react'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import type { ReviewRating } from '../domain/sessionGamification'
import {
  getRatingExitMotion,
  RATING_ANIMATION_MS,
} from '../domain/sessionGamification'

interface StudyRatingFlyoutProps {
  rating: ReviewRating
  animationKey: number
}

const TONE_OVERLAY = {
  danger: 'bg-danger-500/10',
  neutral: 'bg-on-surface/5',
  success: 'bg-success-500/10',
} as const

export function StudyRatingFlyout({
  rating,
  animationKey,
}: StudyRatingFlyoutProps) {
  const reducedMotion = useReducedMotion()
  const motionPreset = getRatingExitMotion(rating)

  if (reducedMotion) return null

  return (
    <motion.div
      key={animationKey}
      data-testid="study-session-rating-flyout"
      className={`pointer-events-none absolute inset-0 z-20 rounded-[inherit] ${TONE_OVERLAY[motionPreset.tone]}`}
      initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
      animate={{
        opacity: [0, 1, 0],
        x: motionPreset.x,
        y: motionPreset.y,
        scale: 0.94,
      }}
      transition={{ duration: RATING_ANIMATION_MS / 1000, ease: 'easeOut' }}
    />
  )
}
