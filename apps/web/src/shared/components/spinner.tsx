import type * as React from 'react'
import { cn } from '../utils'

interface SpinnerProps extends React.ComponentProps<'span'> {
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-[2.5px]',
  lg: 'w-9 h-9 border-3',
}

/**
 * Obsidian Flux loading spinner.
 * Track: surface-container (#222229). Arc: on-surface (#ECEDF1).
 */
export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-surface-container-high border-t-on-surface animate-spin',
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
