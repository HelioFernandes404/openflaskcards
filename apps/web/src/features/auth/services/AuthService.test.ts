import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { sessionStorage } from '@/shared/services/sessionStorage'
import { AuthService } from './AuthService'

// jsdom's real localStorage isn't reliably available in this test
// environment (see useDashboardSummaryVisible.test.ts) — stub it like
// apiClient.test.ts does so sessionStorage.ts has somewhere to write.
function createStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub())
    authService = new AuthService()
    sessionStorage.clearSession()
  })

  afterEach(() => {
    sessionStorage.clearSession()
    vi.unstubAllGlobals()
  })

  it('login persists the token pair and returns the authenticated user', async () => {
    const user = await authService.login({
      email: 'user@example.com',
      password: 'supersecretpass',
    })

    expect(user.email).toBe('user@example.com')
    expect(sessionStorage.getAccessToken()).toBe('mock-access-token')
    expect(sessionStorage.getRefreshToken()).toBe('mock-refresh-token')
  })

  it('register persists the token pair and returns the authenticated user', async () => {
    const user = await authService.register({
      email: 'new@example.com',
      password: 'supersecretpass',
      nickname: 'newuser',
    })

    expect(user.email).toBe('user@example.com')
    expect(sessionStorage.getAccessToken()).toBe('mock-access-token')
    expect(sessionStorage.getRefreshToken()).toBe('mock-refresh-token')
  })

  it('login propagates the error and does not persist a session on invalid credentials', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          { code: 'INVALID_CREDENTIALS', message: 'invalid credentials' },
          { status: 401 },
        ),
      ),
    )

    await expect(
      authService.login({ email: 'bad@example.com', password: 'wrong' }),
    ).rejects.toBeTruthy()
    expect(sessionStorage.getAccessToken()).toBeNull()
  })

  it('refreshToken persists the rotated access and refresh tokens', async () => {
    sessionStorage.setSession({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresIn: 900,
    })
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({
          access_token: 'rotated-access',
          refresh_token: 'rotated-refresh',
          token_type: 'bearer',
          expires_in: 900,
        }),
      ),
    )

    await authService.refreshToken()

    expect(sessionStorage.getAccessToken()).toBe('rotated-access')
    expect(sessionStorage.getRefreshToken()).toBe('rotated-refresh')
  })

  it('refreshToken throws without calling the API when there is no refresh token', async () => {
    await expect(authService.refreshToken()).rejects.toThrow(
      'No refresh token available',
    )
  })

  it('logout clears the session even when the API call fails', async () => {
    sessionStorage.setSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    })
    server.use(
      http.post('*/api/v1/auth/logout', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 }),
      ),
    )

    await authService.logout()

    expect(sessionStorage.getAccessToken()).toBeNull()
    expect(sessionStorage.getRefreshToken()).toBeNull()
  })

  it('getCurrentUser stores the fetched user in the session', async () => {
    const user = await authService.getCurrentUser()

    expect(user.email).toBe('user@example.com')
    expect(sessionStorage.getUser()?.email).toBe('user@example.com')
  })
})
