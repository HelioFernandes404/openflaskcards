import { apiConfig } from '@/shared/config/api'
import { ApiError, HttpClientError } from './apiErrors'

type ApiLogContext = {
  method: string
  url: string
  startedAt: number
  requestId: string
}

let lastRequestId: string | undefined

export function getLastRequestId(): string | undefined {
  return lastRequestId
}

export function setLastRequestId(requestId: string): void {
  lastRequestId = requestId
}

export function generateRequestId(): string {
  return crypto.randomUUID()
}

type StructuredError = {
  data?: unknown
  code?: string
  details?: unknown
  message?: string
  name?: string
  headers?: Headers
  response?: {
    data?: unknown
    headers?: Headers
    status?: number
  }
  status?: number
  statusCode?: number
}

const REDACTED_VALUE = '[REDACTED]'
const SECRET_FIELD_PATTERN =
  /^(authorization|access[_-]?token|refresh[_-]?token|password|current[_-]?password|new[_-]?password)$/i

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${Math.round((bytes / 1024 ** index) * 100) / 100} ${units[index]}`
}

function getResponseSize(response: Response, data: unknown): number {
  const contentLength = response.headers.get('content-length')

  if (contentLength) {
    const parsedLength = Number(contentLength)

    if (Number.isFinite(parsedLength)) {
      return parsedLength
    }
  }

  try {
    return new Blob([JSON.stringify(data)]).size
  } catch {
    return 0
  }
}

export function createApiLogContext(
  method: string,
  url: string,
  requestId: string,
): ApiLogContext {
  setLastRequestId(requestId)
  return {
    method: method.toUpperCase(),
    url,
    startedAt: Date.now(),
    requestId,
  }
}

function shouldLog(): boolean {
  return apiConfig.enableLogging
}

function maskSecretValue(key: string, value: unknown): unknown {
  if (!SECRET_FIELD_PATTERN.test(key)) {
    return value
  }

  if (
    typeof value === 'string' &&
    key.toLowerCase() === 'authorization' &&
    /^bearer\s+/i.test(value)
  ) {
    return 'Bearer [REDACTED]'
  }

  return REDACTED_VALUE
}

function sanitizeHeaders(
  headers?: HeadersInit,
): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  const entries = new Headers(headers).entries()

  return Object.fromEntries(
    Array.from(entries, ([key, value]) => [
      key,
      String(maskSecretValue(key, value)),
    ]),
  )
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key) {
    const maskedValue = maskSecretValue(key, value)

    if (maskedValue !== value) {
      return maskedValue
    }
  }

  if (value instanceof Headers) {
    return sanitizeHeaders(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item))
  }

  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof FormData) &&
    !(value instanceof Blob) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof ArrayBuffer)
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue]) => [
          entryKey,
          sanitizeValue(entryValue, entryKey),
        ],
      ),
    )
  }

  return value
}

function logRequestDetails(
  headers: HeadersInit | undefined,
  body: unknown,
): void {
  const requestHeaders = sanitizeHeaders(headers)

  console.log('Headers:', requestHeaders)

  if (body !== undefined) {
    console.log('Body:', sanitizeValue(body))
  }
}

function getErrorType(error: unknown): string {
  if (error instanceof Error) {
    return error.name
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    return String((error as StructuredError).name)
  }

  return typeof error
}

function getErrorStatus(error: unknown): number | 'Network Error' {
  if (error instanceof ApiError) {
    return error.statusCode ?? 'Network Error'
  }

  if (error instanceof HttpClientError) {
    return error.status ?? 'Network Error'
  }

  const structuredError = error as StructuredError

  return (
    structuredError.status ??
    structuredError.statusCode ??
    structuredError.response?.status ??
    'Network Error'
  )
}

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpClientError) {
    return error.code
  }

  return (error as StructuredError).code
}

function getErrorDetails(error: unknown): unknown {
  if (error instanceof ApiError) {
    return error.details
  }

  if (error instanceof HttpClientError) {
    return error.data
  }

  const structuredError = error as StructuredError

  return (
    structuredError.details ??
    structuredError.data ??
    structuredError.response?.data
  )
}

function getErrorHeaders(error: unknown): Headers | undefined {
  if (error instanceof HttpClientError) {
    return error.headers
  }

  const structuredError = error as StructuredError

  return structuredError.headers ?? structuredError.response?.headers
}

function logErrorDetails(error: unknown): void {
  console.log('Error Type:', getErrorType(error))
  console.log('Status:', getErrorStatus(error))

  const errorCode = getErrorCode(error)

  if (errorCode) {
    console.log('Code:', errorCode)
  }

  console.log(
    'Message:',
    error instanceof Error ? error.message : String(error),
  )

  const details = getErrorDetails(error)

  if (details !== undefined) {
    console.log('Details:', sanitizeValue(details))
  }

  const headers = getErrorHeaders(error)

  if (headers) {
    console.log('Headers:', sanitizeHeaders(headers))
  }
}

export function logApiRequest(
  context: ApiLogContext,
  input: {
    body?: unknown
    headers?: HeadersInit
  } = {},
): void {
  if (!shouldLog()) {
    return
  }

  console.groupCollapsed(
    `%c🚀 API Request: ${context.method} ${context.url}`,
    'color: #3b82f6; font-weight: 500',
  )
  console.log('Request ID:', context.requestId)
  console.log('Method:', context.method)
  console.log('URL:', context.url)
  logRequestDetails(input.headers, input.body)
  console.groupEnd()
}

export function logApiResponse(
  context: ApiLogContext,
  response: Response,
  data: unknown,
): void {
  if (!shouldLog()) {
    return
  }

  const duration = Date.now() - context.startedAt
  const size = getResponseSize(response, data)
  const responseRequestId = response.headers.get('X-Request-ID')

  if (responseRequestId) {
    setLastRequestId(responseRequestId)
  }

  console.groupCollapsed(
    `%c✅ API Response: ${context.method} ${context.url} (${duration}ms)`,
    'color: #10b981; font-weight: 500',
  )
  console.log('Request ID:', responseRequestId ?? context.requestId)
  console.log('Status:', response.status, response.statusText)
  console.log('Duration:', `${duration}ms`)
  console.log('Size:', formatBytes(size))
  console.log('Headers:', sanitizeHeaders(response.headers))
  console.log('Data:', sanitizeValue(data))
  console.groupEnd()
}

export function logApiError(context: ApiLogContext, error: unknown): void {
  if (!shouldLog()) {
    return
  }

  const duration = Date.now() - context.startedAt

  console.groupCollapsed(
    `%c❌ API Error: ${context.method} ${context.url} (${duration}ms)`,
    'color: #ef4444; font-weight: bold',
  )
  console.log('Request ID:', context.requestId)
  console.log('Duration:', `${duration}ms`)
  logErrorDetails(error)
  console.groupEnd()
}

export function setupApiLogger(): void {
  return
}

export type { ApiLogContext }
