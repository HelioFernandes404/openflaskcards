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
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('@tanstack/react-router', () => ({
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

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the same success message whether or not the email has an account', async () => {
    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByTestId('forgot-password-email-input'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByTestId('forgot-password-submit-button'))

    await waitFor(() =>
      expect(
        screen.getByTestId('forgot-password-success-message'),
      ).toBeInTheDocument(),
    )
  })

  it('shows an error banner when the request itself fails', async () => {
    server.use(
      http.post('*/api/v1/auth/forgot-password', () =>
        HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 }),
      ),
    )
    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByTestId('forgot-password-email-input'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByTestId('forgot-password-submit-button'))

    await waitFor(() =>
      expect(
        screen.getByTestId('forgot-password-error-alert'),
      ).toBeInTheDocument(),
    )
    expect(
      screen.queryByTestId('forgot-password-success-message'),
    ).not.toBeInTheDocument()
  })
})
