import type { User } from '@/shared/types/api'

/**
 * Session Storage Service
 * Centralizes all localStorage access for authentication state
 * Prevents duplication and ensures consistency
 */
class SessionStorageService {
  private readonly KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    TOKEN_EXPIRY: 'tokenExpiry',
    USER: 'user',
  } as const

  // Access Token
  getAccessToken(): string | null {
    return localStorage.getItem(this.KEYS.ACCESS_TOKEN)
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.KEYS.ACCESS_TOKEN, token)
  }

  removeAccessToken(): void {
    localStorage.removeItem(this.KEYS.ACCESS_TOKEN)
  }

  // Refresh Token
  getRefreshToken(): string | null {
    return localStorage.getItem(this.KEYS.REFRESH_TOKEN)
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.KEYS.REFRESH_TOKEN, token)
  }

  removeRefreshToken(): void {
    localStorage.removeItem(this.KEYS.REFRESH_TOKEN)
  }

  // Token Expiry
  getTokenExpiry(): number | null {
    const expiry = localStorage.getItem(this.KEYS.TOKEN_EXPIRY)
    return expiry ? parseInt(expiry, 10) : null
  }

  setTokenExpiry(expiryTimestamp: number): void {
    localStorage.setItem(this.KEYS.TOKEN_EXPIRY, expiryTimestamp.toString())
  }

  removeTokenExpiry(): void {
    localStorage.removeItem(this.KEYS.TOKEN_EXPIRY)
  }

  // User
  getUser(): User | null {
    const userStr = localStorage.getItem(this.KEYS.USER)
    if (!userStr) return null

    try {
      return JSON.parse(userStr) as User
    } catch {
      // Invalid JSON, clear it
      this.removeUser()
      return null
    }
  }

  setUser(user: User): void {
    localStorage.setItem(this.KEYS.USER, JSON.stringify(user))
  }

  removeUser(): void {
    localStorage.removeItem(this.KEYS.USER)
  }

  // Combined operations
  setSession(params: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user?: User
  }): void {
    this.setAccessToken(params.accessToken)
    this.setRefreshToken(params.refreshToken)
    this.setTokenExpiry(Date.now() + params.expiresIn * 1000)

    if (params.user) {
      this.setUser(params.user)
    }
  }

  clearSession(): void {
    this.removeAccessToken()
    this.removeRefreshToken()
    this.removeTokenExpiry()
    this.removeUser()
  }

  getSession(): {
    accessToken: string | null
    refreshToken: string | null
    user: User | null
  } {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
      user: this.getUser(),
    }
  }

  isTokenExpired(bufferMs: number = 0): boolean {
    const expiry = this.getTokenExpiry()
    if (!expiry) return true
    return Date.now() >= expiry - bufferMs
  }

  hasValidSession(): boolean {
    return !!(
      this.getAccessToken() &&
      this.getRefreshToken() &&
      !this.isTokenExpired()
    )
  }
}

export const sessionStorage = new SessionStorageService()
