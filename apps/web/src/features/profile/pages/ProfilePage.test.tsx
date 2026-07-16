import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { NotificationProvider } from '@/shared/providers/NotificationProvider'
import type { User } from '@/shared/types/api'

const refreshUserMock = vi.fn()

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  nickname: 'user',
  name: 'Mock User',
  isEmailVerified: true,
  timezone: null,
  createdAt: '2024-01-01T00:00:00Z',
} as unknown as User

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: baseUser,
    refreshUser: refreshUserMock,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ history: { canGoBack: () => false } }),
}))

describe('ProfilePage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('updates timezone successfully and refreshes the user', async () => {
    const { ProfilePage } = await import('./ProfilePage')

    render(
      <NotificationProvider>
        <ProfilePage />
      </NotificationProvider>,
    )

    const select = screen.getByTestId('profile-timezone-select')
    fireEvent.change(select, { target: { value: 'Europe/London' } })

    await waitFor(() => expect(refreshUserMock).toHaveBeenCalledTimes(1))
    expect(select).not.toBeDisabled()
  })

  it('shows an error toast and stops saving when updating the timezone fails', async () => {
    server.use(
      http.patch('*/api/v1/users/me', () =>
        HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 }),
      ),
    )
    const { ProfilePage } = await import('./ProfilePage')

    render(
      <NotificationProvider>
        <ProfilePage />
      </NotificationProvider>,
    )

    const select = screen.getByTestId('profile-timezone-select')
    fireEvent.change(select, { target: { value: 'Europe/London' } })

    await waitFor(() =>
      expect(
        screen.getByText(/couldn't complete your request/i),
      ).toBeInTheDocument(),
    )
    expect(refreshUserMock).not.toHaveBeenCalled()
    expect(select).not.toBeDisabled()
  })
})
