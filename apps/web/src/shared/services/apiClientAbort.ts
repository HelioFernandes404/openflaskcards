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

export async function waitForPromiseOrAbort<T>(
  promise: Promise<T>,
  signal?: NullableAbortSignal,
): Promise<T> {
  throwIfAborted(signal)

  if (!signal) {
    return promise
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      signal.removeEventListener('abort', onAbort)
      reject(createAbortError())
    }

    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}
