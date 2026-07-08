/**
 * Base API Error class
 * All custom API errors extend from this
 */
export class ApiError extends Error {
  readonly statusCode?: number
  readonly details?: unknown

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export type HttpClientErrorCode = 'NETWORK' | 'TIMEOUT' | 'ABORT'

export class HttpClientError extends Error {
  readonly status?: number
  readonly data?: unknown
  readonly headers?: Headers
  readonly code?: HttpClientErrorCode

  constructor(
    message: string,
    status?: number,
    data?: unknown,
    headers?: Headers,
    code?: HttpClientErrorCode,
  ) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
    this.data = data
    this.headers = headers
    this.code = code
    Object.setPrototypeOf(this, HttpClientError.prototype)
  }
}

/**
 * Network error - server unreachable
 */
export class NetworkError extends ApiError {
  constructor(message: string = 'Network error: Unable to reach the server') {
    super(message)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

export class AbortError extends ApiError {
  constructor(message: string = 'Request aborted') {
    super(message)
    this.name = 'AbortError'
    Object.setPrototypeOf(this, AbortError.prototype)
  }
}

/**
 * Authentication error - 401
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, details)
    this.name = 'AuthenticationError'
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Authorization error - 403
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access forbidden', details?: unknown) {
    super(message, 403, details)
    this.name = 'AuthorizationError'
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * Not found error - 404
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, details)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Validation error - 400, 422
 */
export class ValidationError extends ApiError {
  readonly validationErrors?: Record<string, string[]>

  constructor(
    message: string = 'Validation failed',
    validationErrors?: Record<string, string[]>,
    details?: unknown,
  ) {
    super(message, 422, details)
    this.name = 'ValidationError'
    this.validationErrors = validationErrors
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Server error - 5xx
 */
export class ServerError extends ApiError {
  constructor(
    message: string = 'Internal server error',
    statusCode: number = 500,
    details?: unknown,
  ) {
    super(message, statusCode, details)
    this.name = 'ServerError'
    Object.setPrototypeOf(this, ServerError.prototype)
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout') {
    super(message)
    this.name = 'TimeoutError'
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

/**
 * Parse error response from API
 */
interface ErrorResponse {
  error?: string
  detail?: string | Record<string, string[]>
  message?: string
  validation_errors?: Record<string, string[]>
}

function extractMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data
  }

  if (!data || typeof data !== 'object') {
    return 'An error occurred'
  }

  const response = data as ErrorResponse

  if (typeof response.detail === 'string') {
    return response.detail
  }

  return response.error || response.message || 'An error occurred'
}

function extractValidationErrors(
  data: unknown,
): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  const response = data as ErrorResponse

  return (
    response.validation_errors ||
    (typeof response.detail === 'object' ? response.detail : undefined)
  )
}

/**
 * Convert transport errors to typed ApiError
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof HttpClientError) {
    if (error.code === 'TIMEOUT') {
      return new TimeoutError()
    }

    if (error.code === 'ABORT') {
      return new AbortError()
    }

    if (error.code === 'NETWORK' || error.status == null) {
      return new NetworkError()
    }

    const status = error.status
    const data = error.data
    const message = extractMessage(data)
    const validationErrors = extractValidationErrors(data)

    switch (status) {
      case 401:
        return new AuthenticationError(message, data)
      case 403:
        return new AuthorizationError(message, data)
      case 404:
        return new NotFoundError(message, data)
      case 400:
      case 422:
        return new ValidationError(message, validationErrors, data)
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message, status, data)
      default:
        return new ApiError(message, status, data)
    }
  }

  return new NetworkError()
}
