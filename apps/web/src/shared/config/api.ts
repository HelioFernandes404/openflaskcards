import type { ResolvedRuntimeConfig } from '@/shared/types/runtimeConfig'
import { readRuntimeConfig } from './runtimeConfig'

/**
 * API Configuration
 * Environment-based configuration for API client
 */

interface ApiConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableLogging: boolean
}

interface ApiEnvironment {
  [key: string]: string | boolean | undefined
  VITE_API_URL?: string
  VITE_API_TIMEOUT?: string
  VITE_API_RETRY_ATTEMPTS?: string
  VITE_API_RETRY_DELAY?: string
  VITE_ENABLE_LOGGING?: string
}

interface ResolveApiConfigInput {
  env: ApiEnvironment
  runtimeConfig?: ResolvedRuntimeConfig
}

function resolveNumber(
  value: string | number | undefined,
  fallback: number,
): number {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/**
 * Get API configuration from environment variables
 */
export function resolveApiConfig({
  env,
  runtimeConfig,
}: ResolveApiConfigInput): ApiConfig {
  return {
    baseURL:
      runtimeConfig?.apiUrl ||
      env.VITE_API_URL ||
      'http://localhost:3030/api/v1',
    timeout: resolveNumber(
      runtimeConfig?.apiTimeout ?? env.VITE_API_TIMEOUT,
      10000,
    ),
    retryAttempts: resolveNumber(
      runtimeConfig?.apiRetryAttempts ?? env.VITE_API_RETRY_ATTEMPTS,
      3,
    ),
    retryDelay: resolveNumber(
      runtimeConfig?.apiRetryDelay ?? env.VITE_API_RETRY_DELAY,
      1000,
    ),
    enableLogging: env.VITE_ENABLE_LOGGING === 'true',
  }
}

function getApiConfig(): ApiConfig {
  return resolveApiConfig({
    env: import.meta.env,
    runtimeConfig: readRuntimeConfig(),
  })
}

export const apiConfig = getApiConfig()
