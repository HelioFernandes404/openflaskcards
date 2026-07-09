import type React from 'react'
import { createContext, useState, useEffect, useContext } from 'react'
import type { User } from '@/shared/types/api'
import { authService } from '../services/AuthService'
import type { LoginRequest, RegisterRequest } from '../types/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateSession = async () => {
      // The access token lives only in memory, so it's always gone after a
      // full page reload. The only way to know if the user still has a
      // session is to attempt a silent refresh — the httpOnly refresh
      // token cookie (if any) is sent automatically by the browser. A
      // failure here (no cookie, expired, revoked) just means "not
      // authenticated", not an error to surface.
      try {
        await authService.refreshToken()
        const user = await authService.getCurrentUser()
        setUser(user)
      } catch (error) {
        console.error('Session validation failed', error)
        authService.clearSession()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    validateSession()
  }, [])

  const login = async (credentials: LoginRequest) => {
    const user = await authService.login(credentials)
    setUser(user)
  }

  const register = async (data: RegisterRequest) => {
    const user = await authService.register(data)
    setUser(user)
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const logoutAll = async () => {
    await authService.logoutAll()
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const user = await authService.getCurrentUser()
      setUser(user)
    } catch (error) {
      console.error('Failed to refresh user', error)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, logoutAll, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
