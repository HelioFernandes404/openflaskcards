import { httpClient } from '@/shared/services/apiClient'
import { sessionStorage } from '@/shared/services/sessionStorage'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../types/auth'
import type { User } from '@/shared/types/api'

/**
 * Authentication Service
 *
 * Handles user authentication operations including:
 * - Login and registration
 * - Token management (access & refresh tokens)
 * - Session persistence
 * - User logout
 */
export class AuthService {
  async login(credentials: LoginRequest): Promise<User> {
    const { data } = await httpClient.post<AuthResponse>(
      '/auth/login',
      credentials,
    )
    this.setSession(data)
    // Fetch user data after successful login
    const user = await this.getCurrentUser()
    return user
  }

  async register(registerData: RegisterRequest): Promise<User> {
    const { data } = await httpClient.post<AuthResponse>(
      '/auth/register',
      registerData,
    )
    this.setSession(data)
    // Fetch user data after successful registration
    const user = await this.getCurrentUser()
    return user
  }

  async logout(): Promise<void> {
    const refreshToken = sessionStorage.getRefreshToken()

    try {
      if (refreshToken) {
        await httpClient.post('/auth/logout', { refresh_token: refreshToken })
      }
    } catch (err) {
      console.error('API logout failed', err)
    } finally {
      sessionStorage.clearSession()
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await httpClient.post('/auth/logout-all')
    } catch (err) {
      console.error('API logout-all failed', err)
    } finally {
      sessionStorage.clearSession()
    }
  }

  async refreshToken(): Promise<void> {
    const refreshToken = sessionStorage.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const { data } = await httpClient.post<RefreshTokenResponse>(
      '/auth/refresh',
      {
        refresh_token: refreshToken,
      } as RefreshTokenRequest,
    )

    // Update access token, rotated refresh token, and expiry
    sessionStorage.setAccessToken(data.access_token)
    sessionStorage.setRefreshToken(data.refresh_token)
    sessionStorage.setTokenExpiry(Date.now() + data.expires_in * 1000)
  }

  async forgotPassword(email: string): Promise<void> {
    await httpClient.post('/auth/forgot-password', { email })
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await httpClient.post('/auth/reset-password', { token, password })
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await httpClient.get<User>('/auth/me')
    sessionStorage.setUser(data)
    return data
  }

  setSession(auth: AuthResponse): void {
    sessionStorage.setSession({
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      expiresIn: auth.expires_in,
    })
  }

  getSession(): {
    accessToken: string | null
    refreshToken: string | null
    user: User | null
  } {
    return sessionStorage.getSession()
  }

  isTokenExpired(): boolean {
    return sessionStorage.isTokenExpired()
  }

  clearSession(): void {
    sessionStorage.clearSession()
  }
}

export const authService = new AuthService()
