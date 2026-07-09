import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { accessTokenStore } from '@/shared/services/accessTokenStore'
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
    accessTokenStore.clear()
  })

  afterEach(() => {
    sessionStorage.clearSession()
    accessTokenStore.clear()
    vi.unstubAllGlobals()
  })

  it('login stores the access token in memory and returns the authenticated user', async () => {
    const user = await authService.login({
      email: 'user@example.com',
      password: 'supersecretpass',
    })

    expect(user.email).toBe('user@example.com')
    expect(accessTokenStore.get()).toBe('mock-access-token')
  })

  it('register stores the access token in memory and returns the authenticated user', async () => {
    const user = await authService.register({
      email: 'new@example.com',
      password: 'supersecretpass',
      nickname: 'newuser',
    })

    expect(user.email).toBe('user@example.com')
    expect(accessTokenStore.get()).toBe('mock-access-token')
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
    expect(accessTokenStore.get()).toBeNull()
  })

  it('refreshToken stores the rotated access token; refresh token stays server-side (cookie)', async () => {
    accessTokenStore.set('old-access', 900)
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({
          access_token: 'rotated-access',
          token_type: 'bearer',
          expires_in: 900,
        }),
      ),
    )

    await authService.refreshToken()

    expect(accessTokenStore.get()).toBe('rotated-access')
  })

  it('refreshToken rejects when the server reports no valid refresh cookie', async () => {
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json(
          { code: 'INVALID_TOKEN', message: 'invalid token' },
          { status: 401 },
        ),
      ),
    )

    await expect(authService.refreshToken()).rejects.toBeTruthy()
    expect(accessTokenStore.get()).toBeNull()
  })

  it('logout clears the in-memory access token even when the API call fails', async () => {
    accessTokenStore.set('access', 900)
    server.use(
      http.post('*/api/v1/auth/logout', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 }),
      ),
    )

    await authService.logout()

    expect(accessTokenStore.get()).toBeNull()
  })

  it('getCurrentUser stores the fetched user in the session', async () => {
    const user = await authService.getCurrentUser()

    expect(user.email).toBe('user@example.com')
    expect(sessionStorage.getUser()?.email).toBe('user@example.com')
  })
})
