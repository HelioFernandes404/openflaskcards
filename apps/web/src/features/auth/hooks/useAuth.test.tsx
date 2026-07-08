import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
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

describe('useAuth / AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub())
    sessionStorage.clearSession()
  })

  afterEach(() => {
    sessionStorage.clearSession()
    vi.unstubAllGlobals()
  })

  it('starts with loading=true and no user when there is no stored session', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('restores the session and fetches the user when tokens are already stored', async () => {
    sessionStorage.setSession({
      accessToken: 'stored-access',
      refreshToken: 'stored-refresh',
      expiresIn: 900,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.email).toBe('user@example.com')
  })

  it('clears the session when the stored token is rejected by the API', async () => {
    sessionStorage.setSession({
      accessToken: 'stale-access',
      refreshToken: 'stale-refresh',
      expiresIn: 900,
    })
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
    expect(sessionStorage.getAccessToken()).toBeNull()
  })

  it('login sets the authenticated user', async () => {
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
    sessionStorage.setSession({
      accessToken: 'stored-access',
      refreshToken: 'stored-refresh',
      expiresIn: 900,
    })
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
