import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-[150ms] gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-[3px] disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active active:scale-[.98] disabled:bg-transparent disabled:text-on-surface-variant disabled:border disabled:border-outline-variant',
        neutral:
          'bg-transparent text-on-surface border border-outline hover:bg-surface-container-low hover:border-on-surface',
        danger:
          'text-danger-800 bg-danger-50 border border-danger-200 hover:bg-danger-50',
        ghost:
          'bg-transparent text-on-surface-variant border border-outline-variant hover:text-on-surface hover:border-outline',
      },
      size: {
        default: 'h-10 px-[22px] py-[11px]',
        sm: 'h-8 px-[14px] py-[7px] text-xs rounded-sm',
        lg: 'h-11 px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
