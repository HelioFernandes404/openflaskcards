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
import { accessTokenStore } from './accessTokenStore'
import { sessionStorage } from './sessionStorage'

let refreshPromise: Promise<void> | null = null

function redirectToLogin(): void {
  globalThis.location?.assign?.('/login')
}

function handleRefreshFailure(error: unknown): never {
  accessTokenStore.clear()
  sessionStorage.clearSession()
  redirectToLogin()
  throw error instanceof ApiError ? error : parseApiError(error)
}

function isDefinitiveRefreshFailure(error: unknown): boolean {
  if (error instanceof HttpClientError) return error.status === 401
  return error instanceof ApiError && error.statusCode === 401
}

// Refreshes the access token using the httpOnly refresh token cookie —
// the browser attaches it automatically (see credentials: 'include' in
// buildRequestInit), so no refresh token ever needs to be read or sent by
// client JS. A missing/expired/revoked cookie surfaces as a 401 from the
// server, which handleRefreshFailure treats as "not authenticated".
export async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const requestId = generateRequestId()
    const request = buildRequestInit(
      '/auth/refresh',
      'POST',
      {
        skipAuth: true,
      },
      requestId,
    )
    const logContext = createApiLogContext('POST', request.url, requestId)
    logApiRequest(logContext, { headers: request.init.headers })
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
      accessTokenStore.set(data.access_token, data.expires_in)
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
  // Nothing to refresh yet: this app instance never established a session
  // (e.g. a call fired before AuthProvider's mount-time silent refresh
  // resolved, or a genuinely anonymous page). Let the request go out
  // without a token rather than spend a round trip on a refresh call that
  // has no cookie to succeed with.
  if (!accessTokenStore.hasEverHadSession()) return
  if (
    !accessTokenStore.get() ||
    accessTokenStore.isExpired(ACCESS_TOKEN_REFRESH_BUFFER_MS)
  ) {
    await waitForPromiseOrAbort(refreshAccessToken(), signal)
  }
}
