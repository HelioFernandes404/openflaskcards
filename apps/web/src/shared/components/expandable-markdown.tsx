import { useState, useRef, useEffect } from 'react'
import { MarkdownContent } from './markdown-content'
import { cn } from '@/shared/utils'

interface ExpandableMarkdownProps {
  text: string
  className?: string
}

export function ExpandableMarkdown({
  text,
  className,
}: ExpandableMarkdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    setTimeout(() => {
      if (!containerRef.current) return
      const container = containerRef.current
      const isOverflowing = container.scrollHeight > container.clientHeight + 4
      setCanExpand(isOverflowing)
    }, 0)
  }, [text])

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={containerRef}
        className={cn(
          'markdown-content transition-all',
          !isExpanded && 'max-h-48 overflow-hidden',
          isExpanded && 'overflow-visible',
        )}
      >
        <MarkdownContent content={text} variant="document" />
      </div>

      {canExpand && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-2"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
