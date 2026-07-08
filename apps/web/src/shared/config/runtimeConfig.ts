import type {
  ResolvedRuntimeConfig,
  RuntimeConfig,
} from '@/shared/types/runtimeConfig'

function coerceNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

function getWindowRuntimeConfig(): RuntimeConfig | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.__COGCS_CONFIG__
}

export function readRuntimeConfig(): ResolvedRuntimeConfig | undefined {
  const runtimeConfig = getWindowRuntimeConfig()

  if (!runtimeConfig) {
    return undefined
  }

  return {
    apiUrl: runtimeConfig.apiUrl,
    apiTimeout: coerceNumber(runtimeConfig.apiTimeout),
    apiRetryAttempts: coerceNumber(runtimeConfig.apiRetryAttempts),
    apiRetryDelay: coerceNumber(runtimeConfig.apiRetryDelay),
  }
}
