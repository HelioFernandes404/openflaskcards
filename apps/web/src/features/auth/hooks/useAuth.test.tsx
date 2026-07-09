import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { accessTokenStore } from '@/shared/services/accessTokenStore'
import { sessionStorage } from '@/shared/services/sessionStorage'
import { AuthProvider, useAuth } from './useAuth'

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

// No refresh token cookie is present in this test environment, so the
// mount-time silent refresh (see useAuth.tsx) must be told to fail —
// otherwise the default mock /auth/refresh handler would happily succeed
// and every test would start "logged in".
function mockNoRefreshCookie() {
  server.use(
    http.post('*/api/v1/auth/refresh', () =>
      HttpResponse.json(
        { code: 'INVALID_TOKEN', message: 'invalid token' },
        { status: 401 },
      ),
    ),
  )
}

describe('useAuth / AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub())
    sessionStorage.clearSession()
    accessTokenStore.clear()
  })

  afterEach(() => {
    sessionStorage.clearSession()
    accessTokenStore.clear()
    vi.unstubAllGlobals()
  })

  it('starts with loading=true and no user when there is no refresh cookie', async () => {
    mockNoRefreshCookie()

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('restores the session via silent refresh and fetches the user when a refresh cookie is valid', async () => {
    // Default mock handlers already return a successful /auth/refresh —
    // simulating a valid httpOnly cookie being sent automatically.
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.email).toBe('user@example.com')
  })

  it('clears the session when the refreshed token is rejected by the API', async () => {
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    )

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(accessTokenStore.get()).toBeNull()
  })

  it('login sets the authenticated user', async () => {
    mockNoRefreshCookie()
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.login({
        email: 'user@example.com',
        password: 'supersecretpass',
      })
    })

    expect(result.current.user?.email).toBe('user@example.com')
  })

  it('logout clears the authenticated user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
  })
})
