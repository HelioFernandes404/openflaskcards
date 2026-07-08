import { describe, expect, it, vi } from 'vitest'
import { withRetry } from './retryLogic'

describe('withRetry', () => {
  it('retries when shouldRetry returns true and attempts remain', async () => {
    const transientError = new Error('transient')
    const operation = vi
      .fn<() => Promise<{ ok: boolean }>>()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValue({ ok: true })

    const result = await withRetry(operation, {
      maxAttempts: 2,
      delayMs: 1,
      shouldRetry: (error) => error === transientError,
    })

    expect(result).toEqual({ ok: true })
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('does not retry when shouldRetry returns false', async () => {
    const fatalError = new Error('fatal')
    const operation = vi
      .fn<() => Promise<never>>()
      .mockRejectedValue(fatalError)

    await expect(
      withRetry(operation, {
        maxAttempts: 3,
        delayMs: 1,
        shouldRetry: () => false,
      }),
    ).rejects.toBe(fatalError)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('uses conservative fallback without retry when shouldRetry is not provided', async () => {
    const error = new Error('no retry by default')
    const operation = vi.fn<() => Promise<never>>().mockRejectedValue(error)

    await expect(
      withRetry(operation, { maxAttempts: 3, delayMs: 1 }),
    ).rejects.toBe(error)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('interrupts backoff on abort and does not trigger extra attempt', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const transientError = new Error('transient')
    const operation = vi
      .fn<() => Promise<{ ok: boolean }>>()
      .mockRejectedValue(transientError)

    const request = withRetry(operation, {
      maxAttempts: 3,
      delayMs: 100,
      signal: controller.signal,
      shouldRetry: () => true,
    })

    await vi.advanceTimersByTimeAsync(50)
    controller.abort()

    await expect(request).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(operation).toHaveBeenCalledTimes(1)
  })
})
