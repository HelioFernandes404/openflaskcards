import '@testing-library/jest-dom/vitest'
import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationProvider, useNotification } from './NotificationProvider'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: React.ComponentProps<'div'>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('@/shared/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

function ToastTrigger({ message }: { message: string }) {
  const { showToast } = useNotification()
  return (
    <button type="button" onClick={() => showToast(message, 'success')}>
      Show toast
    </button>
  )
}

describe('NotificationProvider', () => {
  it('shows toast when showToast is called', async () => {
    render(
      <NotificationProvider>
        <ToastTrigger message="Deck created" />
      </NotificationProvider>,
    )

    await act(async () => {
      screen.getByRole('button', { name: 'Show toast' }).click()
    })

    expect(screen.getByText('Deck created')).toBeInTheDocument()
  })
})
