import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationProvider } from '@/shared/providers/NotificationProvider'
import type { User } from '@/shared/types/api'

const useAuthMock = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate" data-to={to} />
  ),
  Outlet: () => <div data-testid="outlet" />,
}))

describe('ProtectedRoute', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows a spinner while the session is loading', async () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })
    const { ProtectedRoute } = await import('./ProtectedRoute')

    render(<ProtectedRoute />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })

  it('redirects to /login when there is no authenticated user', async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })
    const { ProtectedRoute } = await import('./ProtectedRoute')

    render(<ProtectedRoute />)

    const navigate = screen.getByTestId('navigate')
    expect(navigate).toHaveAttribute('data-to', '/login')
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument()
  })

  it('renders the nested route when authenticated', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' } as User,
      loading: false,
    })
    const { ProtectedRoute } = await import('./ProtectedRoute')

    render(
      <NotificationProvider>
        <ProtectedRoute />
      </NotificationProvider>,
    )

    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })
})
