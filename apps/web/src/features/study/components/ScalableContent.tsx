import { forwardRef, useMemo, type ReactNode, type CSSProperties } from 'react'

interface ScalableContentProps {
  /** Scale factor (0.5 - 1.0) */
  scale: number
  /** Content to scale */
  children: ReactNode
  /** Additional className for the wrapper */
  className?: string
}

/**
 * Wrapper that applies CSS transform scale to its children.
 * Uses transform-origin: top center for predictable scaling behavior.
 *
 * Note: Parent container should have a defined height for proper layout compensation.
 */
export const ScalableContent = forwardRef<HTMLDivElement, ScalableContentProps>(
  function ScalableContent({ scale, children, className = '' }, ref) {
    // Clamp scale to valid range
    const clampedScale = Math.min(1, Math.max(0.5, scale))

    const style: CSSProperties = useMemo(
      () => ({
        transform: `scale(${clampedScale})`,
        transformOrigin: 'top center',
        // Compensate for scaled height to prevent layout shift
        height: clampedScale < 1 ? `${100 / clampedScale}%` : 'auto',
      }),
      [clampedScale],
    )

    return (
      <div
        ref={ref}
        className={`transition-transform duration-200 ${className}`}
        style={style}
      >
        {children}
      </div>
    )
  },
)
