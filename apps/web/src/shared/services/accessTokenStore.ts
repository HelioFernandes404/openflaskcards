/**
 * In-memory access token store.
 *
 * The access token is short-lived and must never touch localStorage (or any
 * other persistent storage) — that's exactly the XSS-exfiltration surface
 * this store exists to close off. It lives only as a module-level variable,
 * so it's gone on full page reload; the refresh token (httpOnly cookie, set
 * by the server) is what lets the app silently re-establish a session after
 * a reload — see AuthProvider's mount-time refresh in useAuth.tsx.
 */
class AccessTokenStore {
  private token: string | null = null
  private expiryTimestamp: number | null = null
  // Tracks whether this app instance has ever successfully obtained an
  // access token (login/register/refresh). Used by ensureValidAccessToken
  // to decide whether a missing/expired token is worth proactively
  // refreshing — without it, every call to a protected endpoint made
  // before any session was ever established (e.g. a stray fetch on an
  // anonymous page load) would trigger a wasted /auth/refresh round trip.
  private everHadSession = false

  get(): string | null {
    return this.token
  }

  set(token: string, expiresInSeconds: number): void {
    this.token = token
    this.expiryTimestamp = Date.now() + expiresInSeconds * 1000
    this.everHadSession = true
  }

  clear(): void {
    this.token = null
    this.expiryTimestamp = null
    this.everHadSession = false
  }

  isExpired(bufferMs: number = 0): boolean {
    if (!this.expiryTimestamp) return true
    return Date.now() >= this.expiryTimestamp - bufferMs
  }

  hasEverHadSession(): boolean {
    return this.everHadSession
  }
}

export const accessTokenStore = new AccessTokenStore()
