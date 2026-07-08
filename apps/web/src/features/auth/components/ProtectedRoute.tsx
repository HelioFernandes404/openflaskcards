import { Navigate, Outlet } from '@tanstack/react-router'
import { Spinner } from '@/shared/components/spinner'
import { SelectionSpeechProvider } from '@/shared/providers/SelectionSpeechProvider'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <SelectionSpeechProvider>
      <Outlet />
    </SelectionSpeechProvider>
  )
}
