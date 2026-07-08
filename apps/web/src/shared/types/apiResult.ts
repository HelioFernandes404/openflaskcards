/**
 * API Result wrapper types
 * Optional utility for handling success/error states in a functional way
 */

import type { ApiError } from '@/shared/services/apiErrors'

/**
 * Success result
 */
export interface Success<T> {
  success: true
  data: T
}

/**
 * Error result
 */
export interface Failure {
  success: false
  error: ApiError
}

/**
 * API Result - discriminated union for type-safe error handling
 * Use this when you want to handle errors without try/catch
 */
export type ApiResult<T> = Success<T> | Failure

/**
 * Type guards
 */
export function isSuccess<T>(result: ApiResult<T>): result is Success<T> {
  return result.success === true
}

export function isFailure<T>(result: ApiResult<T>): result is Failure {
  return result.success === false
}

/**
 * Helper to create success result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data }
}

/**
 * Helper to create failure result
 */
export function failure(error: ApiError): Failure {
  return { success: false, error }
}

/**
 * Wrap an async function to return ApiResult instead of throwing
 * Useful for converting existing promise-based APIs
 *
 * Example:
 * ```ts
 * const result = await withResult(() => apiClient.get('/users'))
 * if (isSuccess(result)) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export async function withResult<T>(
  fn: () => Promise<T>,
): Promise<ApiResult<T>> {
  try {
    const data = await fn()
    return success(data)
  } catch (err) {
    if (err instanceof Error) {
      return failure(err as ApiError)
    }
    return failure(
      new (await import('@/shared/services/apiErrors')).ApiError(
        'Unknown error',
      ),
    )
  }
}

/**
 * Map the data of a successful result
 */
export function map<T, U>(
  result: ApiResult<T>,
  mapper: (data: T) => U,
): ApiResult<U> {
  if (isSuccess(result)) {
    return success(mapper(result.data))
  }
  return result
}

/**
 * Chain results - useful for sequential operations
 */
export async function chain<T, U>(
  result: ApiResult<T>,
  fn: (data: T) => Promise<ApiResult<U>>,
): Promise<ApiResult<U>> {
  if (isSuccess(result)) {
    return fn(result.data)
  }
  return result
}

/**
 * Get data or default value
 */
export function getOrElse<T>(result: ApiResult<T>, defaultValue: T): T {
  return isSuccess(result) ? result.data : defaultValue
}

/**
 * Get data or throw error
 */
export function unwrap<T>(result: ApiResult<T>): T {
  if (isSuccess(result)) {
    return result.data
  }
  throw result.error
}
