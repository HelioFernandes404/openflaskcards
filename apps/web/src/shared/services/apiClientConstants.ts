import type { HttpRequestConfig } from './httpTypes'

export type InternalHttpRequestConfig = HttpRequestConfig & {
  body?: unknown
}

export type PreparedRequest = {
  url: string
  init: RequestInit
}

export type NullableAbortSignal = AbortSignal | null | undefined

const AUTH_ROUTES_WITHOUT_TOKEN = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
])

export const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000

export function normalizeAbortSignal(
  signal: NullableAbortSignal,
): AbortSignal | undefined {
  return signal ?? undefined
}

function normalizePath(path: string): string {
  const withoutOrigin = path.replace(/^https?:\/\/[^/]+/i, '')
  const [pathname] = withoutOrigin.split(/[?#]/, 1)

  if (!pathname) {
    return '/'
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

export function isAuthRouteWithoutToken(path: string): boolean {
  return AUTH_ROUTES_WITHOUT_TOKEN.has(normalizePath(path))
}
