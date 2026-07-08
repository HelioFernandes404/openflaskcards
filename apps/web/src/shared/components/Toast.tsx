import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { fadeInUp, reducedMotionVariants, transitions } from '../utils/motion'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  onClose: () => void
  variant?: ToastVariant
  duration?: number
}

/** oklch dot colors — one per semantic role */
const dotColor: Record<ToastVariant, string> = {
  success: 'oklch(68% 0.13 145)',
  warning: 'oklch(68% 0.13 85)',
  error: 'oklch(68% 0.13 25)',
  info: '#ECEDF1',
}

export function Toast({
  message,
  onClose,
  variant = 'success',
  duration = 3200,
}: ToastProps) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [onClose, duration])

  return (
    <motion.div
      variants={reducedMotion ? reducedMotionVariants : fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitions.normal}
      className="fixed bottom-8 right-8 z-[200]"
    >
      <div className="bg-surface-container border border-outline rounded-[10px] px-[18px] py-[14px] flex items-center gap-[14px] min-w-[300px] max-w-[500px]">
        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: dotColor[variant] }}
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-medium text-on-surface tracking-[-0.01em] leading-snug">
            {message}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="shrink-0 font-mono text-[11px] text-neutral-500 hover:text-on-surface-variant transition-colors"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
