import * as SwitchPrimitive from '@radix-ui/react-switch'

import type * as React from 'react'

import { cn } from '../utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-outline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=unchecked]:bg-surface-container',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full transition-all duration-200 data-[state=checked]:bg-on-primary data-[state=checked]:translate-x-[21px] data-[state=unchecked]:bg-neutral-500 data-[state=unchecked]:translate-x-[3px]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
