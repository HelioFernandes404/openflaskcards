export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  shouldRetry: (error: unknown) => boolean
  signal?: AbortSignal
}

const MAX_BACKOFF_MS = 30000
const DEFAULT_MAX_ATTEMPTS = 1
const DEFAULT_DELAY_MS = 0

const defaultRetryConfig: RetryConfig = {
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  delayMs: DEFAULT_DELAY_MS,
  shouldRetry: () => false,
  signal: undefined,
}

function createAbortError(): Error {
  return typeof DOMException !== 'undefined'
    ? new DOMException('The operation was aborted.', 'AbortError')
    : Object.assign(new Error('The operation was aborted.'), {
        name: 'AbortError',
      })
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    throwIfAborted(signal)
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = (): void => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
      reject(createAbortError())
    }

    if (signal?.aborted) {
      onAbort()
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function getBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * 2 ** attempt, MAX_BACKOFF_MS)
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig: RetryConfig = {
    ...defaultRetryConfig,
    ...config,
  }
  const maxAttempts = Math.max(1, retryConfig.maxAttempts)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    throwIfAborted(retryConfig.signal)

    try {
      return await operation()
    } catch (error) {
      const shouldRetry =
        attempt < maxAttempts - 1 && retryConfig.shouldRetry(error)

      if (!shouldRetry) {
        throw error
      }

      await sleep(
        getBackoffDelay(attempt, retryConfig.delayMs),
        retryConfig.signal,
      )
    }
  }

  throw new Error('Retry loop exited unexpectedly')
}
