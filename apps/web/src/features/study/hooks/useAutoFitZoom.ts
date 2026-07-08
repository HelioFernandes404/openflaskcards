import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'

interface UseAutoFitZoomOptions {
  /** Minimum scale factor (default: 0.5 = 50%) */
  minScale?: number
  /** Height reserved for elements outside scaled content (buttons, padding) */
  reservedHeight?: number
  /** Enable/disable auto-fit (default: true) */
  enabled?: boolean
  /** Dependencies that trigger recalculation when changed */
  dependencies?: unknown[]
}

interface UseAutoFitZoomReturn {
  /** Current scale factor (0.5 - 1.0) */
  scale: number
  /** Ref to attach to the content container */
  contentRef: RefObject<HTMLDivElement | null>
  /** Ref to attach to the viewport container */
  viewportRef: RefObject<HTMLDivElement | null>
  /** Manually trigger recalculation */
  recalculate: () => void
}

/**
 * Hook that calculates scale factor to fit content within available viewport space.
 * Uses ResizeObserver to react to content and viewport size changes.
 */
export function useAutoFitZoom({
  minScale = 0.5,
  reservedHeight = 120,
  enabled = true,
  dependencies = [],
}: UseAutoFitZoomOptions = {}): UseAutoFitZoomReturn {
  const [scale, setScale] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const calculateAndSetScale = useCallback(() => {
    if (!enabled || !contentRef.current || !viewportRef.current) {
      return 1
    }

    const viewportHeight = viewportRef.current.clientHeight
    const availableHeight = viewportHeight - reservedHeight

    if (availableHeight <= 0) {
      return 1
    }

    // Get natural height of content (without scale transform)
    const contentElement = contentRef.current
    const currentTransform = contentElement.style.transform
    contentElement.style.transform = 'none'
    const naturalHeight = contentElement.scrollHeight
    contentElement.style.transform = currentTransform

    if (naturalHeight <= availableHeight) {
      return 1
    }

    return Math.max(minScale, availableHeight / naturalHeight)
  }, [enabled, minScale, reservedHeight])

  useEffect(() => {
    let rafId: number

    if (!enabled) {
      // Reset scale via rAF when disabled
      rafId = requestAnimationFrame(() => {
        setScale(1)
      })
      return () => cancelAnimationFrame(rafId)
    }

    const handleResize = () => {
      // Use requestAnimationFrame to batch updates and avoid cascading renders
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const newScale = calculateAndSetScale()
        setScale(newScale)
      })
    }

    // Initial calculation via rAF
    handleResize()

    // Set up ResizeObserver for both content and viewport
    const resizeObserver = new ResizeObserver(handleResize)

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current)
    }

    // Also listen to window resize
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled, calculateAndSetScale])

  // Recalculate when dependencies change
  useEffect(() => {
    if (enabled) {
      const timeout = setTimeout(() => {
        requestAnimationFrame(() => {
          setScale(calculateAndSetScale())
        })
      }, 50)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies])

  return {
    scale,
    contentRef,
    viewportRef,
    recalculate: () => {
      requestAnimationFrame(() => {
        setScale(calculateAndSetScale())
      })
    },
  }
}
