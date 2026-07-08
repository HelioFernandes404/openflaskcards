import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
  className?: string
}

/**
 * Reusable empty state: title + optional hint + optional action.
 * Drop it inside any container; padding is internal.
 */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      <p className="font-semibold text-base text-on-surface">{title}</p>
      {hint && <p className="text-sm mt-1 text-on-surface-variant">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
