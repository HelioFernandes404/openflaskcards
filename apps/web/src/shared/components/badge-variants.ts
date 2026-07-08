import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-[11px] py-1 text-[11px] font-mono font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden transition-colors duration-[150ms]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-on-primary',
        neutral:
          'bg-surface-container text-on-surface-variant border border-outline',
        outlined: 'bg-transparent text-on-surface border border-outline-strong',
        inactive:
          'bg-transparent text-neutral-500 border border-outline-variant line-through',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
