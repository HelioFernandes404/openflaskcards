import type { RefreshTokenResponse } from '@/features/auth/types/auth'
import {
  createApiLogContext,
  generateRequestId,
  logApiError,
  logApiRequest,
  logApiResponse,
} from './apiLogger'
import { ApiError, HttpClientError, parseApiError } from './apiErrors'
import {
  ACCESS_TOKEN_REFRESH_BUFFER_MS,
  type NullableAbortSignal,
} from './apiClientConstants'
import { waitForPromiseOrAbort } from './apiClientAbort'
import {
  buildRequestInit,
  parseErrorData,
  parseResponse,
} from './apiClientRequest'
import { executeRequest } from './apiClientTransport'
import { sessionStorage } from './sessionStorage'

let refreshPromise: Promise<void> | null = null

function redirectToLogin(): void {
  globalThis.location?.assign?.('/login')
}

function handleRefreshFailure(error: unknown): never {
  sessionStorage.clearSession()
  redirectToLogin()
  throw error instanceof ApiError ? error : parseApiError(error)
}

function isDefinitiveRefreshFailure(error: unknown): boolean {
  if (error instanceof HttpClientError) return error.status === 401
  return error instanceof ApiError && error.statusCode === 401
}

export async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  const refreshToken = sessionStorage.getRefreshToken()
  if (!refreshToken)
    handleRefreshFailure(new HttpClientError('Missing refresh token', 401))

  refreshPromise = (async () => {
    const requestId = generateRequestId()
    const request = buildRequestInit(
      '/auth/refresh',
      'POST',
      {
        body: { refresh_token: refreshToken },
        skipAuth: true,
      },
      requestId,
    )
    const logContext = createApiLogContext('POST', request.url, requestId)
    logApiRequest(logContext, {
      body: { refresh_token: refreshToken },
      headers: request.init.headers,
    })
    try {
      const response = await executeRequest(request, true, true)
      if (!response.ok) {
        throw parseApiError(
          new HttpClientError(
            `Request failed with status ${response.status}`,
            response.status,
            await parseErrorData(response),
            response.headers,
          ),
        )
      }
      const data = await parseResponse<RefreshTokenResponse>(response)
      logApiResponse(logContext, response, data)
      sessionStorage.setAccessToken(data.access_token)
      sessionStorage.setRefreshToken(data.refresh_token)
      sessionStorage.setTokenExpiry(Date.now() + data.expires_in * 1000)
    } catch (error) {
      logApiError(logContext, error)
      throw error
    }
  })()

  try {
    await refreshPromise
  } catch (error) {
    if (isDefinitiveRefreshFailure(error)) handleRefreshFailure(error)
    throw error instanceof ApiError ? error : parseApiError(error)
  } finally {
    refreshPromise = null
  }
}

export async function ensureValidAccessToken(
  signal?: NullableAbortSignal,
): Promise<void> {
  if (!sessionStorage.getRefreshToken()) return
  if (
    !sessionStorage.getAccessToken() ||
    sessionStorage.isTokenExpired(ACCESS_TOKEN_REFRESH_BUFFER_MS)
  ) {
    await waitForPromiseOrAbort(refreshAccessToken(), signal)
  }
}
