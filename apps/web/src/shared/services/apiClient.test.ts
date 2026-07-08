import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

async function loadHttpClientWithBaseURL(
  baseURL: string,
  timeout = 10000,
  enableLogging = false,
) {
  vi.doMock('@/shared/config/api', () => ({
    apiConfig: {
      baseURL,
      timeout,
      retryAttempts: 3,
      retryDelay: 1,
      enableLogging,
    },
  }))

  vi.resetModules()

  try {
    const { httpClient } = await import('./apiClient')

    return httpClient
  } finally {
    vi.doUnmock('@/shared/config/api')
    vi.resetModules()
  }
}

async function loadHttpClient() {
  return loadHttpClientWithBaseURL('http://localhost:3030/api/v1', 10000, false)
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('httpClient contract', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub())
    vi.stubGlobal('location', {
      assign: vi.fn(),
      href: 'http://localhost/',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns { data, status, headers } on successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<{ ok: boolean }>('/health')

    expect(response.data).toEqual({ ok: true })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('logs request and response when logging is enabled', async () => {
    const groupCollapsed = vi
      .spyOn(console, 'groupCollapsed')
      .mockImplementation(() => undefined)
    const groupEnd = vi
      .spyOn(console, 'groupEnd')
      .mockImplementation(() => undefined)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1', 10000, true)
    await httpClient.get<{ ok: boolean }>('/health')

    const labels = groupCollapsed.mock.calls.map(([label]) => String(label))

    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('API Request: GET /api/v1/health'),
        expect.stringContaining('API Response: GET /api/v1/health'),
      ]),
    )
    expect(groupEnd).toHaveBeenCalledTimes(2)
  })

  it('logs error when logging is enabled', async () => {
    const groupCollapsed = vi
      .spyOn(console, 'groupCollapsed')
      .mockImplementation(() => undefined)
    const groupEnd = vi
      .spyOn(console, 'groupEnd')
      .mockImplementation(() => undefined)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: 'boom' }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        ),
      ),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1', 10000, true)

    await expect(httpClient.get('/health')).rejects.toMatchObject({
      name: 'ServerError',
      statusCode: 500,
    })

    const labels = groupCollapsed.mock.calls.map(([label]) => String(label))

    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('API Request: GET /api/v1/health'),
        expect.stringContaining('API Error: GET /api/v1/health'),
      ]),
    )
    expect(groupEnd).toHaveBeenCalledTimes(2)
  })

  it.each([
    [
      'get',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.get('/health'),
      'GET',
    ],
    [
      'post',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.post('/health', { ping: true }),
      'POST',
    ],
    [
      'put',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.put('/health', { ping: true }),
      'PUT',
    ],
    [
      'patch',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.patch('/health', { ping: true }),
      'PATCH',
    ],
    [
      'delete',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.delete('/health'),
      'DELETE',
    ],
  ] as const)('uses correct HTTP method in %s', async (_name, invoke, method) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClient()
    await invoke(httpClient)

    const fetchMock = vi.mocked(globalThis.fetch)
    const [, requestInit] = fetchMock.mock.calls[0] ?? []

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestInit?.method).toBe(method)
  })

  it.each([
    [
      'post',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.post('/health', { ping: true }),
    ],
    [
      'put',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.put('/health', { ping: true }),
    ],
    [
      'patch',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.patch('/health', { ping: true }),
    ],
  ] as const)('serializes JSON only in verbs with payload: %s', async (_name, invoke) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClient()
    await invoke(httpClient)

    const fetchMock = vi.mocked(globalThis.fetch)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = requestInit.headers as Headers

    expect(requestInit.body).toBe(JSON.stringify({ ping: true }))
    expect(headers.get('content-type')).toBe('application/json')
  })

  it.each([
    [
      'get',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.get('/health'),
    ],
    [
      'delete',
      (client: Awaited<ReturnType<typeof loadHttpClient>>) =>
        client.delete('/health'),
    ],
  ] as const)('does not send body in %s', async (_name, invoke) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClient()
    await invoke(httpClient)

    const fetchMock = vi.mocked(globalThis.fetch)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(requestInit).not.toHaveProperty('body')
  })

  it('preserves FormData without forcing JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClient()
    const formData = new FormData()
    formData.append('file', new Blob(['x'], { type: 'text/plain' }), 'x.txt')

    await httpClient.post('/upload', formData)

    const fetchMock = vi.mocked(globalThis.fetch)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = requestInit.headers as Headers

    expect(requestInit.body).toBe(formData)
    expect(headers.get('content-type')).toBeNull()
  })

  it('preserves params and custom headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClient()

    await httpClient.get('/search', {
      params: {
        q: 'cards',
        page: 2,
        active: true,
        ignored: undefined,
      },
      headers: {
        'X-Request-Id': 'abc-123',
      },
    })

    const fetchMock = vi.mocked(globalThis.fetch)
    const [url, requestInit] = fetchMock.mock.calls[0] ?? []
    const headers = requestInit?.headers as Headers

    expect(url).toContain('/search')
    expect(url).toContain('q=cards')
    expect(url).toContain('page=2')
    expect(url).toContain('active=true')
    expect(url).not.toContain('ignored=')
    expect(headers.get('x-request-id')).toBe('abc-123')
  })

  it('preserves params with relative baseURL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')

    await httpClient.get('/search', {
      params: {
        q: 'cards',
        page: 2,
      },
    })

    const fetchMock = vi.mocked(globalThis.fetch)
    const [url] = fetchMock.mock.calls[0] ?? []

    expect(url).toBe('/api/v1/search?q=cards&page=2')
  })

  it('rejects HTTP error path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 500 }))),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/health')).rejects.toMatchObject({
      name: 'ServerError',
      statusCode: 500,
    })
  })

  it('preserves text message from HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('Upstream exploded', {
            status: 502,
            headers: {
              'Content-Type': 'text/plain',
            },
          }),
        ),
      ),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/health')).rejects.toMatchObject({
      name: 'ServerError',
      statusCode: 502,
      message: 'Upstream exploded',
    })
  })

  it('converts 401 to AuthenticationError in fetch client', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/secure')).rejects.toMatchObject({
      name: 'AuthenticationError',
      statusCode: 401,
    })
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)
  })

  it('converts raw fetch rejection to NetworkError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/offline')).rejects.toMatchObject({
      name: 'NetworkError',
    })
  })

  it('retries fetch when there is a transient network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        ),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    const response = await httpClient.get<{ ok: boolean }>('/offline')

    expect(response.data).toEqual({ ok: true })
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2)
  })

  it.each([
    429, 503,
  ])('retries fetch when receiving transient status %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'temporary' }), {
            status,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        ),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    const response = await httpClient.get<{ ok: boolean }>('/retryable')

    expect(response.data).toEqual({ ok: true })
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2)
  })

  it('does not retry POST on transient error, to avoid duplicating mutation', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: 'temporary' }), {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        ),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    await expect(
      httpClient.post('/cards/card-1/review', { rating: 3 }),
    ).rejects.toBeTruthy()

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)
  })

  it('differentiates explicit cancellation from real network failure', async () => {
    const controller = new AbortController()

    vi.stubGlobal(
      'fetch',
      vi.fn((_, init) => {
        const signal = (init as RequestInit | undefined)?.signal as
          | AbortSignal
          | undefined

        return new Promise((_, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              )
            },
            { once: true },
          )
        })
      }),
    )

    const httpClient = await loadHttpClient()
    const request = httpClient.get('/slow', { signal: controller.signal })

    await vi.waitFor(() => {
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)
    })

    controller.abort()

    await expect(request).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)
  })

  it('converts abort by timeout to TimeoutError', async () => {
    vi.useFakeTimers()

    vi.stubGlobal(
      'fetch',
      vi.fn((_, init) => {
        const signal = (init as RequestInit | undefined)?.signal

        return new Promise((_, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              )
            },
            { once: true },
          )
        })
      }),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1', 5)
    const request = httpClient.get('/slow')
    const assertion = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
    })

    await vi.advanceTimersByTimeAsync(5)
    await assertion
  })

  it('handles 204 without payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.delete('/health')

    expect(response.status).toBe(204)
    expect(response.data).toBeUndefined()
  })

  it('accepts non-JSON response as text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('pong', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
          },
        }),
      ),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<string>('/health')

    expect(response.data).toBe('pong')
  })

  it('safely falls back when provided JSON is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{invalid', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<string>('/health')

    expect(response.data).toBe('{invalid')
  })

  it.each([
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
  ])('does not automatically attach Authorization to %s', async (path) => {
    localStorage.setItem('accessToken', 'token-antigo')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
    )

    const httpClient = await loadHttpClient()
    await httpClient.post(path, { ok: true })

    const fetchMock = vi.mocked(globalThis.fetch)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = requestInit.headers as Headers

    expect(headers.get('authorization')).toBeNull()
  })

  it('automatically refreshes when token expires before request', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    vi.stubGlobal(
      'fetch',
      vi.fn((input, init) => {
        const url = String(input)
        const headers = new Headers((init as RequestInit | undefined)?.headers)

        if (url.endsWith('/auth/refresh')) {
          expect(headers.get('authorization')).toBeNull()

          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: 'token-novo',
                token_type: 'bearer',
                expires_in: 60,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }

        expect(headers.get('authorization')).toBe('Bearer token-novo')

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<{ ok: boolean }>('/secure')
    const fetchMock = vi.mocked(globalThis.fetch)

    expect(response.data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/auth\/refresh$/)
    expect(String(fetchMock.mock.calls[1]?.[0])).toMatch(/\/secure$/)
    expect(localStorage.getItem('accessToken')).toBe('token-novo')
  })

  it('persists rotated refresh_token returned by /auth/refresh', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token-antigo')
    localStorage.setItem('tokenExpiry', '1')

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = String(input)

        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: 'token-novo',
                refresh_token: 'refresh-token-novo',
                token_type: 'bearer',
                expires_in: 60,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    await httpClient.get<{ ok: boolean }>('/secure')

    // The API deletes the old refresh token when rotating; if the client doesn't
    // persist the new one, the next refresh always fails with 401 and forces logout.
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token-novo')
  })

  it('does pre-request refresh when token expires within 60s buffer', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', String(Date.now() + 30_000))

    vi.stubGlobal(
      'fetch',
      vi.fn((input, init) => {
        const url = String(input)
        const headers = new Headers((init as RequestInit | undefined)?.headers)

        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: 'token-buffer',
                token_type: 'bearer',
                expires_in: 60,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }

        expect(headers.get('authorization')).toBe('Bearer token-buffer')

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<{ ok: boolean }>('/secure')
    const fetchMock = vi.mocked(globalThis.fetch)

    expect(response.data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/auth\/refresh$/)
    expect(localStorage.getItem('accessToken')).toBe('token-buffer')
  })

  it('retries refresh when /auth/refresh fails transiently', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: 'token-recuperado',
              token_type: 'bearer',
              expires_in: 60,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    const response = await httpClient.get<{ ok: boolean }>('/secure')
    const fetchMock = vi.mocked(globalThis.fetch)

    expect(response.data).toEqual({ ok: true })
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/api/v1/auth/refresh',
      '/api/v1/auth/refresh',
      '/api/v1/secure',
    ])
    expect(localStorage.getItem('accessToken')).toBe('token-recuperado')
  })

  it('retries original request once after 401 and successful refresh', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', String(Date.now() + 120_000))

    vi.stubGlobal(
      'fetch',
      vi.fn((input, init) => {
        const url = String(input)
        const headers = new Headers((init as RequestInit | undefined)?.headers)

        if (
          url.endsWith('/secure') &&
          headers.get('authorization') === 'Bearer token-antigo'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ detail: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }

        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: 'token-novo',
                token_type: 'bearer',
                expires_in: 60,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<{ ok: boolean }>('/secure')
    const fetchMock = vi.mocked(globalThis.fetch)
    const secureCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/secure'),
    )

    expect(response.data).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(secureCalls).toHaveLength(2)
    expect(new Headers(secureCalls[0]?.[1]?.headers).get('authorization')).toBe(
      'Bearer token-antigo',
    )
    expect(new Headers(secureCalls[1]?.[1]?.headers).get('authorization')).toBe(
      'Bearer token-novo',
    )
  })

  it('shares a single refresh queue among concurrent requests', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    const refreshDeferred = createDeferred<Response>()

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = String(input)

        if (url.endsWith('/auth/refresh')) {
          return refreshDeferred.promise
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({ ok: url.endsWith('/secure-1') ? 1 : 2 }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const requestA = httpClient.get('/secure-1')
    const requestB = httpClient.get('/secure-2')
    const fetchMock = vi.mocked(globalThis.fetch)

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).endsWith('/auth/refresh'),
        ),
      ).toHaveLength(1),
    )

    refreshDeferred.resolve(
      new Response(
        JSON.stringify({
          access_token: 'token-novo',
          token_type: 'bearer',
          expires_in: 60,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const [responseA, responseB] = await Promise.all([requestA, requestB])
    const secureCalls = fetchMock.mock.calls.filter(([url]) =>
      /\/secure-[12]$/.test(String(url)),
    )

    expect(responseA.data).toEqual({ ok: 1 })
    expect(responseB.data).toEqual({ ok: 2 })
    expect(secureCalls).toHaveLength(2)
  })

  it('shares single refresh and single replay in 401 path for concurrent requests', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', String(Date.now() + 120_000))

    const refreshDeferred = createDeferred<Response>()

    vi.stubGlobal(
      'fetch',
      vi.fn((input, init) => {
        const url = String(input)
        const headers = new Headers((init as RequestInit | undefined)?.headers)

        if (url.endsWith('/auth/refresh')) {
          return refreshDeferred.promise
        }

        if (headers.get('authorization') === 'Bearer token-antigo') {
          return Promise.resolve(
            new Response(JSON.stringify({ detail: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({ ok: url.endsWith('/secure-1') ? 1 : 2 }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const requestA = httpClient.get('/secure-1')
    const requestB = httpClient.get('/secure-2')
    const fetchMock = vi.mocked(globalThis.fetch)

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).endsWith('/auth/refresh'),
        ),
      ).toHaveLength(1),
    )

    refreshDeferred.resolve(
      new Response(
        JSON.stringify({
          access_token: 'token-novo',
          token_type: 'bearer',
          expires_in: 60,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const [responseA, responseB] = await Promise.all([requestA, requestB])
    const secureCalls = fetchMock.mock.calls.filter(([url]) =>
      /\/secure-[12]$/.test(String(url)),
    )
    const oldTokenCalls = secureCalls.filter(
      ([, init]) =>
        new Headers((init as RequestInit | undefined)?.headers).get(
          'authorization',
        ) === 'Bearer token-antigo',
    )
    const newTokenCalls = secureCalls.filter(
      ([, init]) =>
        new Headers((init as RequestInit | undefined)?.headers).get(
          'authorization',
        ) === 'Bearer token-novo',
    )

    expect(responseA.data).toEqual({ ok: 1 })
    expect(responseB.data).toEqual({ ok: 2 })
    expect(oldTokenCalls).toHaveLength(2)
    expect(newTokenCalls).toHaveLength(2)
  })

  it('clears session and redirects to /login when refresh fails', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = String(input)

        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(
            new Response(JSON.stringify({ detail: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }

        throw new Error(`unexpected url ${url}`)
      }),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/secure')).rejects.toMatchObject({
      name: 'AuthenticationError',
      statusCode: 401,
    })

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(globalThis.location.assign).toHaveBeenCalledWith('/login')
  })

  it('preserves session and does not redirect when refresh fails transiently', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = String(input)

        if (url.endsWith('/auth/refresh')) {
          return Promise.reject(new TypeError('Failed to fetch'))
        }

        throw new Error(`unexpected url ${url}`)
      }),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/secure')).rejects.toMatchObject({
      name: 'NetworkError',
    })

    expect(localStorage.getItem('accessToken')).toBe('token-antigo')
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token')
    expect(globalThis.location.assign).not.toHaveBeenCalled()
  })

  it('logs useful details for ApiError and HttpClientError', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined)
    vi.doMock('@/shared/config/api', () => ({
      apiConfig: {
        baseURL: '/api/v1',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1,
        enableLogging: true,
      },
    }))
    vi.resetModules()

    const { createApiLogContext, logApiError } = await import('./apiLogger')
    const { HttpClientError, ServerError } = await import('./apiErrors')

    logApiError(
      createApiLogContext('GET', '/health', 'test-request-id'),
      new ServerError('boom', 500, { detail: 'boom', traceId: 'req-123' }),
    )
    logApiError(
      createApiLogContext('POST', '/health', 'test-request-id'),
      new HttpClientError(
        'timeout upstream',
        503,
        { retryAfter: 1 },
        undefined,
        'NETWORK',
      ),
    )

    vi.doUnmock('@/shared/config/api')
    vi.resetModules()

    expect(logSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['Error Type:', 'ServerError'],
        ['Status:', 500],
        ['Message:', 'boom'],
        ['Details:', { detail: 'boom', traceId: 'req-123' }],
        ['Error Type:', 'HttpClientError'],
        ['Status:', 503],
        ['Code:', 'NETWORK'],
        ['Message:', 'timeout upstream'],
        ['Details:', { retryAfter: 1 }],
      ]),
    )
  })

  it('masks secrets in request, response, and error logs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined)
    vi.doMock('@/shared/config/api', () => ({
      apiConfig: {
        baseURL: '/api/v1',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1,
        enableLogging: true,
      },
    }))
    vi.resetModules()

    const { createApiLogContext, logApiError, logApiRequest, logApiResponse } =
      await import('./apiLogger')
    const { HttpClientError } = await import('./apiErrors')

    logApiRequest(
      createApiLogContext('POST', '/auth/refresh', 'test-request-id'),
      {
        headers: {
          Authorization: 'Bearer secret-auth',
        },
        body: {
          access_token: 'secret-access',
          refresh_token: 'secret-refresh',
          nested: [{ refresh_token: 'secret-nested' }],
        },
      },
    )

    logApiResponse(
      createApiLogContext('POST', '/auth/refresh', 'test-request-id'),
      new Response(
        JSON.stringify({
          access_token: 'secret-access',
          refresh_token: 'secret-refresh',
        }),
        {
          status: 200,
          headers: {
            Authorization: 'Bearer secret-auth',
            'Content-Type': 'application/json',
          },
        },
      ),
      {
        access_token: 'secret-access',
        refresh_token: 'secret-refresh',
      },
    )

    logApiError(
      createApiLogContext('POST', '/auth/refresh', 'test-request-id'),
      new HttpClientError(
        'refresh failed',
        401,
        {
          access_token: 'secret-access',
          refresh_token: 'secret-refresh',
        },
        new Headers({
          Authorization: 'Bearer secret-auth',
        }),
        'NETWORK',
      ),
    )

    vi.doUnmock('@/shared/config/api')
    vi.resetModules()

    expect(logSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['Headers:', { authorization: 'Bearer [REDACTED]' }],
        [
          'Body:',
          {
            access_token: '[REDACTED]',
            refresh_token: '[REDACTED]',
            nested: [{ refresh_token: '[REDACTED]' }],
          },
        ],
        [
          'Data:',
          {
            access_token: '[REDACTED]',
            refresh_token: '[REDACTED]',
          },
        ],
        [
          'Details:',
          {
            access_token: '[REDACTED]',
            refresh_token: '[REDACTED]',
          },
        ],
      ]),
    )

    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('secret-auth')
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('secret-access')
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('secret-refresh')
  })

  it('respects external AbortSignal while waiting for shared refresh', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    const refreshDeferred = createDeferred<Response>()

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = String(input)

        if (url.endsWith('/auth/refresh')) {
          return refreshDeferred.promise
        }

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const controller = new AbortController()
    const abortedRequest = httpClient.get('/secure', {
      signal: controller.signal,
    })

    controller.abort()
    refreshDeferred.resolve(
      new Response(
        JSON.stringify({
          access_token: 'token-novo',
          token_type: 'bearer',
          expires_in: 60,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    await expect(abortedRequest).rejects.toMatchObject({
      name: 'AbortError',
    })

    const fetchMock = vi.mocked(globalThis.fetch)
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/secure')),
    ).toHaveLength(0)
  })

  it('aborts only one waiter without dropping another request in same shared refresh', async () => {
    localStorage.setItem('accessToken', 'token-antigo')
    localStorage.setItem('refreshToken', 'refresh-token')
    localStorage.setItem('tokenExpiry', '1')

    const refreshDeferred = createDeferred<Response>()

    vi.stubGlobal(
      'fetch',
      vi.fn((input) => {
        const url = String(input)

        if (url.endsWith('/auth/refresh')) {
          return refreshDeferred.promise
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({ ok: url.endsWith('/secure-1') ? 1 : 2 }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
      }),
    )

    const httpClient = await loadHttpClient()
    const controller = new AbortController()
    const abortedRequest = httpClient.get('/secure-1', {
      signal: controller.signal,
    })
    const validRequest = httpClient.get<{ ok: number }>('/secure-2')

    controller.abort()

    refreshDeferred.resolve(
      new Response(
        JSON.stringify({
          access_token: 'token-novo',
          token_type: 'bearer',
          expires_in: 60,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    await expect(abortedRequest).rejects.toMatchObject({
      name: 'AbortError',
    })
    await expect(validRequest).resolves.toMatchObject({
      data: { ok: 2 },
      status: 200,
    })

    const fetchMock = vi.mocked(globalThis.fetch)
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/auth/refresh'),
      ),
    ).toHaveLength(1)
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/secure-1')),
    ).toHaveLength(0)
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/secure-2')),
    ).toHaveLength(1)
  })
})
