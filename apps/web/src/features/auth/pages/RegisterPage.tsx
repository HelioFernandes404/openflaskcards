import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Mail, Lock, UserPlus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@/shared/components/button'
import { Spinner } from '@/shared/components/spinner'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { AuthCard, AuthField } from '../components/AuthShell'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await register({ email, password, nickname, name })
      navigate({ to: '/' })
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'Registration failed. Please try again.',
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      pageTestId="register-page"
      title="Create Account"
      subtitle="Join Study Decker today"
      error={error}
      errorTestId="register-error-alert"
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            data-testid="register-login-link"
            className="text-on-surface underline decoration-outline hover:decoration-on-surface"
          >
            Sign in instead
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="register-form"
      >
        <div className="grid grid-cols-2 gap-4">
          <AuthField
            id="nickname"
            label="Nickname"
            data-testid="register-nickname-input"
            placeholder="johndoe"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <AuthField
            id="name"
            label="Full Name"
            data-testid="register-name-input"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <AuthField
          id="email"
          label="Email Address"
          icon={Mail}
          data-testid="register-email-input"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          data-testid="register-password-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <Button
          type="submit"
          data-testid="register-submit-button"
          className="w-full h-12 text-base font-semibold uppercase tracking-wide flex items-center justify-center gap-2 mt-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner
              size="sm"
              className="border-surface-bright border-t-on-primary"
            />
          ) : (
            <>
              <UserPlus size={18} strokeWidth={1.5} />
              Sign Up
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
