import {
  createApiLogContext,
  generateRequestId,
  logApiError,
  logApiRequest,
  logApiResponse,
} from './apiLogger'
import { ApiError, HttpClientError, parseApiError } from './apiErrors'
import type { InternalHttpRequestConfig } from './apiClientConstants'
import { throwIfAborted } from './apiClientAbort'
import {
  buildRequestInit,
  parseErrorData,
  parseResponse,
} from './apiClientRequest'
import { executeRequest } from './apiClientTransport'
import type { HttpMethod, HttpResponse } from './httpTypes'

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
  parseBody: (response: Response) => Promise<T> = parseResponse<T>,
): Promise<HttpResponse<T>> {
  let logContext: ReturnType<typeof createApiLogContext> | undefined

  try {
    throwIfAborted(config.signal)
    const requestId = resolveRequestId(config.headers)
    const request = buildRequestInit(url, method, config, requestId)
    logContext = createApiLogContext(method, request.url, requestId)
    logApiRequest(logContext, {
      body: config.body,
      headers: request.init.headers,
    })
    const response = await executeRequest(request, true)

    if (!response.ok) {
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
): Promise<HttpResponse<Blob>> {
  return performRequest<Blob>('GET', url, config, (response) => response.blob())
}
