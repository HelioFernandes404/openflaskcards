import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Mail, Lock, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@/shared/components/button'
import { Spinner } from '@/shared/components/spinner'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { AuthCard, AuthField } from '../components/AuthShell'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login({ email, password })
      navigate({ to: '/' })
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'Invalid credentials. Please try again.',
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      pageTestId="login-page"
      title="Welcome Back"
      subtitle="Sign in to your OpenFlashcards account"
      error={error}
      errorTestId="login-error-alert"
      footer={
        <>
          Don't have an account?{' '}
          <Link
            to="/register"
            data-testid="login-register-link"
            className="text-on-surface underline decoration-outline hover:decoration-on-surface"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        data-testid="login-form"
      >
        <AuthField
          id="email"
          label="Email Address"
          icon={Mail}
          data-testid="login-email-input"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div>
          <AuthField
            id="password"
            label="Password"
            icon={Lock}
            data-testid="login-password-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              data-testid="login-forgot-password-link"
              className="text-xs text-on-surface-variant underline decoration-outline hover:decoration-on-surface"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          data-testid="login-submit-button"
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
              <LogIn size={18} strokeWidth={1.5} />
              Sign In
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
