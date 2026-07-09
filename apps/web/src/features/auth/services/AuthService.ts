import { httpClient } from '@/shared/services/apiClient'
import { accessTokenStore } from '@/shared/services/accessTokenStore'
import { sessionStorage } from '@/shared/services/sessionStorage'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenResponse,
} from '../types/auth'
import type { User } from '@/shared/types/api'

/**
 * Authentication Service
 *
 * Handles user authentication operations including:
 * - Login and registration
 * - Access token management (in-memory only, see accessTokenStore.ts)
 * - Cached user profile persistence
 * - User logout
 *
 * The refresh token never passes through this class — it's an httpOnly
 * cookie the browser attaches automatically (login/register/refresh all go
 * through httpClient, which sends credentials: 'include'), and the server
 * clears it on logout. See apps/api/internal/auth/handler.go.
 */
export class AuthService {
  // Dedupes concurrent refreshToken() calls into a single in-flight
  // request. The refresh token is single-use (the server rotates it on
  // every /auth/refresh), so two independent calls racing on the same
  // cookie is not idempotent — the loser gets a 401 on an already-rotated
  // token. This matters in practice because React StrictMode
  // double-invokes AuthProvider's mount effect in dev, which would
  // otherwise fire two refreshToken() calls back to back and log the user
  // out on every reload.
  private refreshPromise: Promise<void> | null = null

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
    try {
      await httpClient.post('/auth/logout')
    } catch (err) {
      console.error('API logout failed', err)
    } finally {
      accessTokenStore.clear()
      sessionStorage.clearSession()
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await httpClient.post('/auth/logout-all')
    } catch (err) {
      console.error('API logout-all failed', err)
    } finally {
      accessTokenStore.clear()
      sessionStorage.clearSession()
    }
  }

  async refreshToken(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      const { data } =
        await httpClient.post<RefreshTokenResponse>('/auth/refresh')
      accessTokenStore.set(data.access_token, data.expires_in)
    })()

    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
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
    accessTokenStore.set(auth.access_token, auth.expires_in)
  }

  getSession(): {
    accessToken: string | null
    user: User | null
  } {
    return {
      accessToken: accessTokenStore.get(),
      user: sessionStorage.getUser(),
    }
  }

  isTokenExpired(): boolean {
    return accessTokenStore.isExpired()
  }

  clearSession(): void {
    accessTokenStore.clear()
    sessionStorage.clearSession()
  }
}

export const authService = new AuthService()
