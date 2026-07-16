import { apiConfig } from '@/shared/config/api'
import { HttpClientError } from './apiErrors'
import type {
  InternalHttpRequestConfig,
  NullableAbortSignal,
  PreparedRequest,
} from './apiClientConstants'

function joinUrl(baseURL: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  const suffix = path.startsWith('/') ? path.slice(1) : path
  return `${base}/${suffix}`
}

function appendParams(
  url: string,
  params?: InternalHttpRequestConfig['params'],
): string {
  if (!params) return url
  const [pathWithQuery, hash = ''] = url.split('#', 2)
  const [path, existingQuery = ''] = pathWithQuery.split('?', 2)
  const searchParams = new URLSearchParams(existingQuery)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value))
  }
  const query = searchParams.toString()
  return `${path}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

function prepareBody(body: unknown): { body?: BodyInit; isJson: boolean } {
  if (body === undefined) return { isJson: false }
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return { body: body as BodyInit, isJson: false }
  }
  return { body: JSON.stringify(body), isJson: true }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function createRequestSignal(
  timeoutMs: number | undefined,
  externalSignal: NullableAbortSignal,
) {
  if (timeoutMs === undefined && externalSignal === undefined) {
    return { signal: undefined, cleanup: () => {}, timedOut: () => false }
  }
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let didTimeout = false
  const abortFromExternalSignal = (): void => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else
      externalSignal.addEventListener('abort', abortFromExternalSignal, {
        once: true,
      })
  }
  if (timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, timeoutMs)
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', abortFromExternalSignal)
    },
    timedOut: () => didTimeout,
  }
}

export function buildRequestInit(
  url: string,
  method: string,
  config: InternalHttpRequestConfig,
  requestId?: string,
): PreparedRequest {
  const { body, headers, params, ...requestInit } = config
  const requestHeaders = new Headers(headers)
  const preparedBody = prepareBody(body)
  if (!requestHeaders.has('Content-Type') && preparedBody.isJson)
    requestHeaders.set('Content-Type', 'application/json')
  const existingRequestId =
    requestHeaders.get('X-Request-ID') ??
    requestHeaders.get('x-request-id') ??
    requestHeaders.get('X-Request-Id')
  if (!existingRequestId && requestId)
    requestHeaders.set('X-Request-ID', requestId)
  return {
    url: appendParams(joinUrl(apiConfig.baseURL, url), params),
    init: {
      ...requestInit,
      method,
      headers: requestHeaders,
      ...(preparedBody.body !== undefined ? { body: preparedBody.body } : {}),
    },
  }
}

export async function executeFetch(
  request: PreparedRequest,
): Promise<Response> {
  const { signal, cleanup, timedOut } = createRequestSignal(
    apiConfig.timeout,
    request.init.signal,
  )
  try {
    return await fetch(request.url, { ...request.init, signal })
  } catch (error) {
    throw timedOut()
      ? new HttpClientError(
          'Request timeout',
          undefined,
          undefined,
          undefined,
          'TIMEOUT',
        )
      : isAbortError(error)
        ? new HttpClientError(
            'Request aborted',
            undefined,
            undefined,
            undefined,
            'ABORT',
          )
        : new HttpClientError(
            'Network error',
            undefined,
            undefined,
            undefined,
            'NETWORK',
          )
  } finally {
    cleanup()
  }
}

export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (contentType.includes('application/json')) {
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      return text as T
    }
  }
  return text as T
}

export async function parseErrorData(response: Response): Promise<unknown> {
  return parseResponse(response)
}
