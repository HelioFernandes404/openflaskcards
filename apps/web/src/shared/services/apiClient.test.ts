import { HttpResponse, http, delay } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'

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

// Access token is in-memory now (see accessTokenStore.ts), not localStorage
// — priming it for a test means importing accessTokenStore in the exact
// same module-registry epoch apiClient's dependency graph was created in
// (between the two vi.resetModules() calls), so both reference the same
// singleton. expiresInSeconds may be negative to simulate an
// already-expired token.
async function loadHttpClientWithSession(
  primeAccessToken: { token: string; expiresInSeconds: number } | null,
  baseURL = 'http://localhost:3030/api/v1',
  timeout = 10000,
) {
  vi.doMock('@/shared/config/api', () => ({
    apiConfig: {
      baseURL,
      timeout,
      retryAttempts: 3,
      retryDelay: 1,
      enableLogging: false,
    },
  }))

  vi.resetModules()

  try {
    const { httpClient } = await import('./apiClient')
    const { accessTokenStore } = await import('./accessTokenStore')
    if (primeAccessToken) {
      accessTokenStore.set(
        primeAccessToken.token,
        primeAccessToken.expiresInSeconds,
      )
    }
    return { httpClient, accessTokenStore }
  } finally {
    vi.doUnmock('@/shared/config/api')
    vi.resetModules()
  }
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

// --- MSW request recorder -------------------------------------------------
//
// The tests below need the same introspection a manually-stubbed
// `vi.fn()` gave for free (call count, method, headers, raw body per
// call). MSW hands the resolver a real `Request`, so this recorder reads
// what's needed out of it and appends it to `calls`, mirroring the shape
// tests used to pull off `vi.mocked(globalThis.fetch).mock.calls`.
interface RecordedRequest {
  url: string
  method: string
  headers: Headers
  bodyText: string | null
}

function createRecorder() {
  const calls: RecordedRequest[] = []
  async function record(request: Request): Promise<RecordedRequest> {
    const bodyText = request.body ? await request.clone().text() : null
    const call: RecordedRequest = {
      url: request.url,
      method: request.method,
      headers: request.headers,
      bodyText,
    }
    calls.push(call)
    return call
  }
  return { calls, record }
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
    server.use(
      http.get('*/health', () =>
        HttpResponse.json({ ok: true }, { status: 200 }),
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

    server.use(http.get('*/health', () => HttpResponse.json({ ok: true })))

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

    server.use(
      http.get('*/health', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
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
    const recorder = createRecorder()
    server.use(
      http.all('*/health', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClient()
    await invoke(httpClient)

    expect(recorder.calls).toHaveLength(1)
    expect(recorder.calls[0]?.method).toBe(method)
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
    const recorder = createRecorder()
    server.use(
      http.all('*/health', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClient()
    await invoke(httpClient)

    const call = recorder.calls[0]
    expect(call?.bodyText).toBe(JSON.stringify({ ping: true }))
    expect(call?.headers.get('content-type')).toBe('application/json')
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
    const recorder = createRecorder()
    server.use(
      http.all('*/health', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClient()
    await invoke(httpClient)

    expect(recorder.calls[0]?.bodyText).toBeNull()
  })

  it('preserves FormData without forcing JSON', async () => {
    const recorder = createRecorder()
    server.use(
      http.post('*/upload', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClient()
    const formData = new FormData()
    formData.append('file', new Blob(['x'], { type: 'text/plain' }), 'x.txt')

    await httpClient.post('/upload', formData)

    const call = recorder.calls[0]
    // apiClient never sets its own Content-Type for FormData bodies — it
    // lets the transport (fetch/undici) add the multipart boundary. What
    // matters here is that apiClient didn't force `application/json`.
    expect(call?.headers.get('content-type')).not.toBe('application/json')
    expect(call?.bodyText).toContain('form-data; name="file"')
  })

  it('preserves params and custom headers', async () => {
    const recorder = createRecorder()
    server.use(
      http.get('*/search', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
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

    const call = recorder.calls[0]
    expect(call?.url).toContain('/search')
    expect(call?.url).toContain('q=cards')
    expect(call?.url).toContain('page=2')
    expect(call?.url).toContain('active=true')
    expect(call?.url).not.toContain('ignored=')
    expect(call?.headers.get('x-request-id')).toBe('abc-123')
  })

  it('preserves params with relative baseURL', async () => {
    const recorder = createRecorder()
    server.use(
      http.get('*/api/v1/search', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')

    await httpClient.get('/search', {
      params: {
        q: 'cards',
        page: 2,
      },
    })

    expect(recorder.calls[0]?.url).toBe(
      'http://localhost/api/v1/search?q=cards&page=2',
    )
  })

  it('rejects HTTP error path', async () => {
    server.use(
      http.get('*/health', () => new HttpResponse('{}', { status: 500 })),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/health')).rejects.toMatchObject({
      name: 'ServerError',
      statusCode: 500,
    })
  })

  it('preserves text message from HTTP error', async () => {
    server.use(
      http.get(
        '*/health',
        () =>
          new HttpResponse('Upstream exploded', {
            status: 502,
            headers: { 'Content-Type': 'text/plain' },
          }),
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
    const recorder = createRecorder()
    server.use(
      http.get('*/secure', async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      }),
    )

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/secure')).rejects.toMatchObject({
      name: 'AuthenticationError',
      statusCode: 401,
    })
    expect(recorder.calls).toHaveLength(1)
  })

  it('converts raw fetch rejection to NetworkError', async () => {
    server.use(http.get('*/offline', () => HttpResponse.error()))

    const httpClient = await loadHttpClient()

    await expect(httpClient.get('/offline')).rejects.toMatchObject({
      name: 'NetworkError',
    })
  })

  it('retries fetch when there is a transient network failure', async () => {
    let attempt = 0
    server.use(
      http.get('*/offline', () => {
        attempt += 1
        if (attempt === 1) return HttpResponse.error()
        return HttpResponse.json({ ok: true })
      }),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    const response = await httpClient.get<{ ok: boolean }>('/offline')

    expect(response.data).toEqual({ ok: true })
    expect(attempt).toBe(2)
  })

  it.each([
    429, 503,
  ])('retries fetch when receiving transient status %s', async (status) => {
    let attempt = 0
    server.use(
      http.get('*/retryable', () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json({ detail: 'temporary' }, { status })
        }
        return HttpResponse.json({ ok: true })
      }),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    const response = await httpClient.get<{ ok: boolean }>('/retryable')

    expect(response.data).toEqual({ ok: true })
    expect(attempt).toBe(2)
  })

  it('does not retry POST on transient error, to avoid duplicating mutation', async () => {
    let attempt = 0
    server.use(
      http.post('*/cards/card-1/review', () => {
        attempt += 1
        return HttpResponse.json({ detail: 'temporary' }, { status: 503 })
      }),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1')
    await expect(
      httpClient.post('/cards/card-1/review', { rating: 3 }),
    ).rejects.toBeTruthy()

    expect(attempt).toBe(1)
  })

  it('differentiates explicit cancellation from real network failure', async () => {
    const controller = new AbortController()

    server.use(
      http.get('*/slow', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClient()
    const request = httpClient.get('/slow', { signal: controller.signal })

    controller.abort()

    await expect(request).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('converts abort by timeout to TimeoutError', async () => {
    server.use(
      http.get('*/slow', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )

    const httpClient = await loadHttpClientWithBaseURL('/api/v1', 5)

    await expect(httpClient.get('/slow')).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })

  it('handles 204 without payload', async () => {
    server.use(
      http.delete('*/health', () => new HttpResponse(null, { status: 204 })),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.delete('/health')

    expect(response.status).toBe(204)
    expect(response.data).toBeUndefined()
  })

  it('accepts non-JSON response as text', async () => {
    server.use(
      http.get(
        '*/health',
        () =>
          new HttpResponse('pong', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
      ),
    )

    const httpClient = await loadHttpClient()
    const response = await httpClient.get<string>('/health')

    expect(response.data).toBe('pong')
  })

  it('safely falls back when provided JSON is invalid', async () => {
    server.use(
      http.get(
        '*/health',
        () =>
          new HttpResponse('{invalid', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
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
    const recorder = createRecorder()
    server.use(
      http.post(`*${path}`, async ({ request }) => {
        await recorder.record(request)
        return HttpResponse.json({})
      }),
    )

    const { httpClient } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: 3600,
    })
    await httpClient.post(path, { ok: true })

    expect(recorder.calls[0]?.headers.get('authorization')).toBeNull()
  })

  it('automatically refreshes when token expires before request', async () => {
    server.use(
      http.post('*/auth/refresh', ({ request }) => {
        expect(request.headers.get('authorization')).toBeNull()
        return HttpResponse.json({
          access_token: 'token-novo',
          token_type: 'bearer',
          expires_in: 60,
        })
      }),
      http.get('*/secure', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token-novo')
        return HttpResponse.json({ ok: true })
      }),
    )

    const { httpClient, accessTokenStore } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })
    const response = await httpClient.get<{ ok: boolean }>('/secure')

    expect(response.data).toEqual({ ok: true })
    expect(accessTokenStore.get()).toBe('token-novo')
  })

  it('ignores any refresh_token field in the /auth/refresh response body', async () => {
    // Rotation happens entirely server-side via the httpOnly cookie now —
    // even if a response body carried a refresh_token, the client must
    // never read or persist it (see issue #44).
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json({
          access_token: 'token-novo',
          refresh_token: 'unexpected-refresh-token',
          token_type: 'bearer',
          expires_in: 60,
        }),
      ),
      http.get('*/secure', () => HttpResponse.json({ ok: true })),
    )

    const { httpClient, accessTokenStore } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })
    await httpClient.get<{ ok: boolean }>('/secure')

    expect(accessTokenStore.get()).toBe('token-novo')
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('does pre-request refresh when token expires within 60s buffer', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({
          access_token: 'token-buffer',
          token_type: 'bearer',
          expires_in: 60,
        })
      }),
      http.get('*/secure', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token-buffer')
        return HttpResponse.json({ ok: true })
      }),
    )

    const { httpClient, accessTokenStore } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: 30,
    })
    const response = await httpClient.get<{ ok: boolean }>('/secure')

    expect(response.data).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
    expect(accessTokenStore.get()).toBe('token-buffer')
  })

  it('retries refresh when /auth/refresh fails transiently', async () => {
    let refreshAttempt = 0
    const urls: string[] = []
    server.use(
      http.post('*/auth/refresh', () => {
        refreshAttempt += 1
        urls.push('/api/v1/auth/refresh')
        if (refreshAttempt === 1) return HttpResponse.error()
        return HttpResponse.json({
          access_token: 'token-recuperado',
          token_type: 'bearer',
          expires_in: 60,
        })
      }),
      http.get('*/secure', () => {
        urls.push('/api/v1/secure')
        return HttpResponse.json({ ok: true })
      }),
    )

    const { httpClient, accessTokenStore } = await loadHttpClientWithSession(
      { token: 'token-antigo', expiresInSeconds: -1 },
      '/api/v1',
    )
    const response = await httpClient.get<{ ok: boolean }>('/secure')

    expect(response.data).toEqual({ ok: true })
    expect(urls).toEqual([
      '/api/v1/auth/refresh',
      '/api/v1/auth/refresh',
      '/api/v1/secure',
    ])
    expect(accessTokenStore.get()).toBe('token-recuperado')
  })

  it('retries original request once after 401 and successful refresh', async () => {
    const secureAuthHeaders: Array<string | null> = []
    server.use(
      http.get('*/secure', ({ request }) => {
        const auth = request.headers.get('authorization')
        secureAuthHeaders.push(auth)
        if (auth === 'Bearer token-antigo') {
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
        }
        return HttpResponse.json({ ok: true })
      }),
      http.post('*/auth/refresh', () =>
        HttpResponse.json({
          access_token: 'token-novo',
          token_type: 'bearer',
          expires_in: 60,
        }),
      ),
    )

    const { httpClient } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: 3600,
    })
    const response = await httpClient.get<{ ok: boolean }>('/secure')

    expect(response.data).toEqual({ ok: true })
    expect(secureAuthHeaders).toEqual([
      'Bearer token-antigo',
      'Bearer token-novo',
    ])
  })

  it('shares a single refresh queue among concurrent requests', async () => {
    const refreshDeferred = createDeferred<Response>()
    let refreshCalls = 0
    const secureCalls: string[] = []

    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1
        return refreshDeferred.promise
      }),
      http.get('*/secure-1', () => {
        secureCalls.push('/secure-1')
        return HttpResponse.json({ ok: 1 })
      }),
      http.get('*/secure-2', () => {
        secureCalls.push('/secure-2')
        return HttpResponse.json({ ok: 2 })
      }),
    )

    const { httpClient } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })
    const requestA = httpClient.get('/secure-1')
    const requestB = httpClient.get('/secure-2')

    await vi.waitFor(() => expect(refreshCalls).toBe(1))

    refreshDeferred.resolve(
      HttpResponse.json({
        access_token: 'token-novo',
        token_type: 'bearer',
        expires_in: 60,
      }),
    )

    const [responseA, responseB] = await Promise.all([requestA, requestB])

    expect(responseA.data).toEqual({ ok: 1 })
    expect(responseB.data).toEqual({ ok: 2 })
    expect(secureCalls).toHaveLength(2)
  })

  it('shares single refresh and single replay in 401 path for concurrent requests', async () => {
    const refreshDeferred = createDeferred<Response>()
    let refreshCalls = 0
    const oldTokenCalls: string[] = []
    const newTokenCalls: string[] = []

    function secureHandler(id: 1 | 2) {
      return ({ request }: { request: Request }) => {
        const auth = request.headers.get('authorization')
        if (auth === 'Bearer token-antigo') {
          oldTokenCalls.push(`/secure-${id}`)
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
        }
        newTokenCalls.push(`/secure-${id}`)
        return HttpResponse.json({ ok: id })
      }
    }

    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1
        return refreshDeferred.promise
      }),
      http.get('*/secure-1', secureHandler(1)),
      http.get('*/secure-2', secureHandler(2)),
    )

    const { httpClient } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: 120,
    })
    const requestA = httpClient.get('/secure-1')
    const requestB = httpClient.get('/secure-2')

    await vi.waitFor(() => expect(refreshCalls).toBe(1))

    refreshDeferred.resolve(
      HttpResponse.json({
        access_token: 'token-novo',
        token_type: 'bearer',
        expires_in: 60,
      }),
    )

    const [responseA, responseB] = await Promise.all([requestA, requestB])

    expect(responseA.data).toEqual({ ok: 1 })
    expect(responseB.data).toEqual({ ok: 2 })
    expect(oldTokenCalls).toHaveLength(2)
    expect(newTokenCalls).toHaveLength(2)
  })

  it('clears session and redirects to /login when refresh fails', async () => {
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }),
      ),
      http.get('*/secure', () => {
        throw new Error('unexpected call to /secure')
      }),
    )

    const { httpClient, accessTokenStore } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })

    await expect(httpClient.get('/secure')).rejects.toMatchObject({
      name: 'AuthenticationError',
      statusCode: 401,
    })

    expect(accessTokenStore.get()).toBeNull()
    expect(globalThis.location.assign).toHaveBeenCalledWith('/login')
  })

  it('preserves session and does not redirect when refresh fails transiently', async () => {
    server.use(
      http.post('*/auth/refresh', () => HttpResponse.error()),
      http.get('*/secure', () => {
        throw new Error('unexpected call to /secure')
      }),
    )

    const { httpClient, accessTokenStore } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })

    await expect(httpClient.get('/secure')).rejects.toMatchObject({
      name: 'NetworkError',
    })

    // A transient (network) refresh failure must not clear the token that
    // was there before the attempt — only a definitive 401 does that.
    expect(accessTokenStore.get()).toBe('token-antigo')
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
    const refreshDeferred = createDeferred<Response>()
    let secureCalls = 0

    server.use(
      http.post('*/auth/refresh', () => refreshDeferred.promise),
      http.get('*/secure', () => {
        secureCalls += 1
        return HttpResponse.json({ ok: true })
      }),
    )

    const { httpClient } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })
    const controller = new AbortController()
    const abortedRequest = httpClient.get('/secure', {
      signal: controller.signal,
    })

    controller.abort()
    refreshDeferred.resolve(
      HttpResponse.json({
        access_token: 'token-novo',
        token_type: 'bearer',
        expires_in: 60,
      }),
    )

    await expect(abortedRequest).rejects.toMatchObject({
      name: 'AbortError',
    })

    expect(secureCalls).toBe(0)
  })

  it('aborts only one waiter without dropping another request in same shared refresh', async () => {
    const refreshDeferred = createDeferred<Response>()
    let refreshCalls = 0
    const secureOneCalls: number[] = []
    const secureTwoCalls: number[] = []

    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1
        return refreshDeferred.promise
      }),
      http.get('*/secure-1', () => {
        secureOneCalls.push(1)
        return HttpResponse.json({ ok: 1 })
      }),
      http.get('*/secure-2', () => {
        secureTwoCalls.push(2)
        return HttpResponse.json({ ok: 2 })
      }),
    )

    const { httpClient } = await loadHttpClientWithSession({
      token: 'token-antigo',
      expiresInSeconds: -1,
    })
    const controller = new AbortController()
    const abortedRequest = httpClient.get('/secure-1', {
      signal: controller.signal,
    })
    const validRequest = httpClient.get<{ ok: number }>('/secure-2')

    controller.abort()

    refreshDeferred.resolve(
      HttpResponse.json({
        access_token: 'token-novo',
        token_type: 'bearer',
        expires_in: 60,
      }),
    )

    await expect(abortedRequest).rejects.toMatchObject({
      name: 'AbortError',
    })
    await expect(validRequest).resolves.toMatchObject({
      data: { ok: 2 },
      status: 200,
    })

    expect(refreshCalls).toBe(1)
    expect(secureOneCalls).toHaveLength(0)
    expect(secureTwoCalls).toHaveLength(1)
  })
})
