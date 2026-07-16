import { apiConfig } from '@/shared/config/api'
import { HttpClientError } from './apiErrors'
import {
  normalizeAbortSignal,
  type PreparedRequest,
} from './apiClientConstants'
import { executeFetch, parseErrorData } from './apiClientRequest'
import { withRetry } from './retryLogic'

function shouldRetryHttpTransportError(error: unknown): boolean {
  if (!(error instanceof HttpClientError)) return false
  if (error.code === 'ABORT' || error.code === 'TIMEOUT') return false
  if (error.code === 'NETWORK' || error.status === 429) return true
  return (
    error.status !== undefined && error.status >= 500 && error.status !== 501
  )
}

// GET/HEAD are safe to retry blindly. Everything else (POST/PATCH/PUT/DELETE)
// mutates state and has no idempotency-key mechanism — retrying it on a lost
// response would duplicate the mutation (e.g. a card review or a bulk create).
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD'])

function isIdempotentMethod(method: string | undefined): boolean {
  return method === undefined || IDEMPOTENT_METHODS.has(method.toUpperCase())
}

export async function executeRequest(
  request: PreparedRequest,
  useRetry: boolean,
  // Set by callers that know their mutation is safe to retry on a
  // transient network error (e.g. it's promise-deduplicated at the call
  // site), unlike a general mutation such as POST /cards/:id/review.
  forceRetryForMutation = false,
): Promise<Response> {
  const send = async (): Promise<Response> => {
    const response = await executeFetch(request)
    if (!response.ok && response.status !== 401) {
      throw new HttpClientError(
        `Request failed with status ${response.status}`,
        response.status,
        await parseErrorData(response),
        response.headers,
      )
    }
    return response
  }

  const canRetry =
    useRetry &&
    (forceRetryForMutation || isIdempotentMethod(request.init.method))
  if (!canRetry) {
    return send()
  }

  return withRetry(send, {
    maxAttempts: apiConfig.retryAttempts,
    delayMs: apiConfig.retryDelay,
    signal: normalizeAbortSignal(request.init.signal),
    shouldRetry: shouldRetryHttpTransportError,
  })
}
