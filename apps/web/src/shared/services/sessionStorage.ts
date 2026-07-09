import type { User } from '@/shared/types/api'

/**
 * Session Storage Service
 *
 * Centralizes localStorage access for the (non-sensitive) cached user
 * profile only. Tokens never live here:
 * - the refresh token is an httpOnly cookie set by the server (never
 *   readable from JS, see apps/api/internal/auth/handler.go);
 * - the access token is short-lived and kept in-memory only, see
 *   accessTokenStore.ts.
 * Both changes close the localStorage XSS-exfiltration surface tracked in
 * issue #44.
 */
class SessionStorageService {
  private readonly KEYS = {
    USER: 'user',
  } as const

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

  clearSession(): void {
    this.removeUser()
  }
}

export const sessionStorage = new SessionStorageService()
