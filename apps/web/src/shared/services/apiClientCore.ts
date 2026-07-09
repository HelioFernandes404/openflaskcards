import {
  createApiLogContext,
  generateRequestId,
  logApiError,
  logApiRequest,
  logApiResponse,
} from './apiLogger'
import { ApiError, HttpClientError, parseApiError } from './apiErrors'
import { ensureValidAccessToken, refreshAccessToken } from './apiClientAuth'
import {
  isAuthRouteWithoutToken,
  type InternalHttpRequestConfig,
  type NullableAbortSignal,
} from './apiClientConstants'
import { throwIfAborted, waitForPromiseOrAbort } from './apiClientAbort'
import {
  buildRequestInit,
  parseErrorData,
  parseResponse,
} from './apiClientRequest'
import { executeRequest } from './apiClientTransport'
import type { HttpMethod, HttpResponse } from './httpTypes'
import { accessTokenStore } from './accessTokenStore'

function resolveRequestId(headers?: HeadersInit): string {
  if (!headers) return generateRequestId()

  const normalized = new Headers(headers)
  return (
    normalized.get('X-Request-ID') ??
    normalized.get('x-request-id') ??
    normalized.get('X-Request-Id') ??
    generateRequestId()
  )
}

function shouldLogError(error: unknown): boolean {
  return (
    !(error instanceof ApiError) ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error instanceof HttpClientError
  )
}

export async function performRequest<T>(
  method: HttpMethod,
  url: string,
  config: InternalHttpRequestConfig = {},
  hasRetried = false,
  parseBody: (response: Response) => Promise<T> = parseResponse<T>,
): Promise<HttpResponse<T>> {
  const shouldHandleAuth = !config.skipAuth && !isAuthRouteWithoutToken(url)
  const shouldRetryRequest = !isAuthRouteWithoutToken(url)
  let logContext: ReturnType<typeof createApiLogContext> | undefined

  try {
    if (shouldHandleAuth && !hasRetried)
      await ensureValidAccessToken(config.signal)
    throwIfAborted(config.signal)
    const requestId = resolveRequestId(config.headers)
    const request = buildRequestInit(url, method, config, requestId)
    logContext = createApiLogContext(method, request.url, requestId)
    logApiRequest(logContext, {
      body: config.body,
      headers: request.init.headers,
    })
    const response = await executeRequest(request, shouldRetryRequest)

    if (!response.ok) {
      if (
        response.status === 401 &&
        shouldHandleAuth &&
        !hasRetried &&
        accessTokenStore.hasEverHadSession()
      ) {
        await waitForPromiseOrAbort(
          refreshAccessToken(),
          config.signal as NullableAbortSignal,
        )
        return performRequest<T>(method, url, config, true, parseBody)
      }
      const apiError = parseApiError(
        new HttpClientError(
          `Request failed with status ${response.status}`,
          response.status,
          await parseErrorData(response),
          response.headers,
        ),
      )
      logApiError(logContext, apiError)
      throw apiError
    }

    const data = await parseBody(response)
    logApiResponse(logContext, response, data)
    return { data, status: response.status, headers: response.headers }
  } catch (error) {
    if (logContext && shouldLogError(error)) logApiError(logContext, error)
    throw error instanceof ApiError ? error : parseApiError(error)
  }
}

export function performBlobRequest(
  url: string,
  config: InternalHttpRequestConfig = {},
  hasRetried = false,
): Promise<HttpResponse<Blob>> {
  return performRequest<Blob>('GET', url, config, hasRetried, (response) =>
    response.blob(),
  )
}
