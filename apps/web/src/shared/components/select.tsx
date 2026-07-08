import type * as React from 'react'

import { cn } from '../utils'

function Select({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'flex h-10 w-full rounded-md border border-outline bg-surface-container-low px-3 py-2 text-sm font-base text-on-surface hover:border-outline-strong focus-visible:outline-none focus-visible:border-on-surface focus-visible:outline-2 focus-visible:outline-[rgba(236,237,241,0.15)] focus-visible:outline-offset-[2px] disabled:cursor-not-allowed disabled:bg-surface-container-lowest disabled:border-outline-variant disabled:text-neutral-500',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select }
