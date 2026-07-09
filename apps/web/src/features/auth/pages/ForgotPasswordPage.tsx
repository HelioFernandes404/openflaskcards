import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Mail, Send } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { Spinner } from '@/shared/components/spinner'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { authService } from '../services/AuthService'
import { AuthCard, AuthField } from '../components/AuthShell'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await authService.forgotPassword(email)
      // Always show the same success state, whether or not the email
      // belongs to an account — the API responds identically on purpose so
      // this page can't be used to check which emails are registered.
      setSubmitted(true)
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'Could not send the reset email. Please try again.',
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      pageTestId="forgot-password-page"
      title="Forgot Password"
      subtitle="We'll email you a link to reset your password"
      error={error}
      errorTestId="forgot-password-error-alert"
      footer={
        <Link
          to="/login"
          data-testid="forgot-password-login-link"
          className="text-on-surface underline decoration-outline hover:decoration-on-surface"
        >
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <p
          data-testid="forgot-password-success-message"
          className="text-sm font-base text-on-surface-variant text-center"
        >
          If an account exists for {email || 'that email'}, we've sent a link to
          reset your password. Check your inbox.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          data-testid="forgot-password-form"
        >
          <AuthField
            id="email"
            label="Email Address"
            icon={Mail}
            data-testid="forgot-password-email-input"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            type="submit"
            data-testid="forgot-password-submit-button"
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
                <Send size={18} strokeWidth={1.5} />
                Send Reset Link
              </>
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
