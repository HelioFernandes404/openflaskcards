import { HttpClientError, parseApiError } from './apiErrors'
import type { NullableAbortSignal } from './apiClientConstants'

export function createAbortError() {
  return parseApiError(
    new HttpClientError(
      'Request aborted',
      undefined,
      undefined,
      undefined,
      'ABORT',
    ),
  )
}

export function throwIfAborted(signal?: NullableAbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}
