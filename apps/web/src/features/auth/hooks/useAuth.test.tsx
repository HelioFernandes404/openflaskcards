import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { AuthProvider, useAuth } from './useAuth'

describe('useAuth / AuthProvider', () => {
  it('fetches the current user on mount', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.email).toBe('user@example.com')
  })

  it('clears the user when the request fails', async () => {
    server.use(
      http.get('*/api/v1/users/me', () =>
        HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
      ),
    )

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('refreshUser re-fetches the current user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    server.use(
      http.get('*/api/v1/users/me', () =>
        HttpResponse.json({
          id: 'user-1',
          email: 'user@example.com',
          nickname: 'updated-nickname',
        }),
      ),
    )

    await act(async () => {
      await result.current.refreshUser()
    })

    expect(result.current.user?.nickname).toBe('updated-nickname')
  })
})
