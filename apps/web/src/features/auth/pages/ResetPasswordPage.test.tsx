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
import { ResetPasswordPage } from './ResetPasswordPage'

const navigateMock = vi.fn()
let searchParams: { token?: string } = { token: 'valid-token' }

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useSearch: () => searchParams,
  Link: ({
    children,
    to,
    ...rest
  }: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

describe('ResetPasswordPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    searchParams = { token: 'valid-token' }
  })

  it('resets the password and navigates to login on success', async () => {
    render(<ResetPasswordPage />)

    fireEvent.change(screen.getByTestId('reset-password-password-input'), {
      target: { value: 'new-super-secret' },
    })
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({ to: '/login' }),
    )
  })

  it('shows an error banner when the token is invalid or expired', async () => {
    server.use(
      http.post('*/api/v1/auth/reset-password', () =>
        HttpResponse.json({ code: 'INVALID_TOKEN' }, { status: 401 }),
      ),
    )
    render(<ResetPasswordPage />)

    fireEvent.change(screen.getByTestId('reset-password-password-input'), {
      target: { value: 'new-super-secret' },
    })
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    await waitFor(() =>
      expect(
        screen.getByTestId('reset-password-error-alert'),
      ).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows an error banner when the link is missing its token', async () => {
    searchParams = {}
    render(<ResetPasswordPage />)

    fireEvent.change(screen.getByTestId('reset-password-password-input'), {
      target: { value: 'new-super-secret' },
    })
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    await waitFor(() =>
      expect(
        screen.getByTestId('reset-password-error-alert'),
      ).toBeInTheDocument(),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
