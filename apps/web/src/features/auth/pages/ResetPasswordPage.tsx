import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Lock, KeyRound } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { Spinner } from '@/shared/components/spinner'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { authService } from '../services/AuthService'
import { AuthCard, AuthField } from '../components/AuthShell'

export function ResetPasswordPage() {
  const { token } = useSearch({ strict: false }) as { token?: string }
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(
        'This reset link is missing its token. Please request a new one.',
      )
      return
    }

    setIsLoading(true)
    try {
      await authService.resetPassword(token, password)
      navigate({ to: '/login' })
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey:
            'This reset link is invalid or has expired. Please request a new one.',
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      pageTestId="reset-password-page"
      title="Reset Password"
      subtitle="Choose a new password for your account"
      error={error}
      errorTestId="reset-password-error-alert"
      footer={
        <>
          Remembered it after all?{' '}
          <Link
            to="/login"
            data-testid="reset-password-login-link"
            className="text-on-surface underline decoration-outline hover:decoration-on-surface"
          >
            Sign in instead
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        data-testid="reset-password-form"
      >
        <AuthField
          id="password"
          label="New Password"
          icon={Lock}
          data-testid="reset-password-password-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <Button
          type="submit"
          data-testid="reset-password-submit-button"
          className="w-full h-12 text-base font-semibold uppercase tracking-wide flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner
              size="sm"
              className="border-surface-bright border-t-on-primary"
            />
          ) : (
            <>
              <KeyRound size={18} strokeWidth={1.5} />
              Reset Password
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
