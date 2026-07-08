import { useCallback, useLayoutEffect, useRef, forwardRef } from 'react'
import { Textarea } from './textarea'
import { cn } from '../utils'

type AutoResizeTextareaProps = React.ComponentProps<typeof Textarea> & {
  maxRows?: number
}

export const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(function AutoResizeTextarea(
  { className, value, onChange, maxRows = 8, rows = 1, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null)

  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        forwardedRef.current = el
      }
    },
    [forwardedRef],
  )

  const resize = useCallback(() => {
    const el = innerRef.current
    if (!el) return

    el.style.height = '0px'
    const styles = getComputedStyle(el)
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20
    const padding =
      Number.parseFloat(styles.paddingTop) +
      Number.parseFloat(styles.paddingBottom)
    const maxHeight = lineHeight * maxRows + padding
    const nextHeight = Math.min(el.scrollHeight, maxHeight)

    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [maxRows])

  useLayoutEffect(() => {
    resize()
  }, [value, resize])

  return (
    <Textarea
      ref={setRef}
      rows={rows}
      value={value}
      onChange={(event) => {
        onChange?.(event)
        requestAnimationFrame(resize)
      }}
      className={cn(
        'flex min-h-10 resize-none overflow-hidden px-[14px] py-3 text-sm font-base transition-[border-color] duration-[150ms]',
        className,
      )}
      {...props}
    />
  )
})
