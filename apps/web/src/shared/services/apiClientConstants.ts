import type { HttpRequestConfig } from './httpTypes'

export type InternalHttpRequestConfig = HttpRequestConfig & {
  body?: unknown
}

export type PreparedRequest = {
  url: string
  init: RequestInit
}

export type NullableAbortSignal = AbortSignal | null | undefined

export function normalizeAbortSignal(
  signal: NullableAbortSignal,
): AbortSignal | undefined {
  return signal ?? undefined
}
