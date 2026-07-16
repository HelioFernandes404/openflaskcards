import type React from 'react'
import { createContext, useState, useEffect, useContext } from 'react'
import type { User } from '@/shared/types/api'
import { httpClient } from '@/shared/services/apiClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    httpClient
      .get<User>('/users/me')
      .then(({ data }) => setUser(data))
      .catch((error) => {
        console.error('Failed to load user', error)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const refreshUser = async () => {
    try {
      const { data } = await httpClient.get<User>('/users/me')
      setUser(data)
    } catch (error) {
      console.error('Failed to refresh user', error)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
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
