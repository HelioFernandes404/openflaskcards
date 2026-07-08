import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiConfig } from './api'
import { readRuntimeConfig } from './runtimeConfig'

afterEach(() => {
  vi.unstubAllGlobals()

  if (typeof window !== 'undefined') {
    delete window.__COGCS_CONFIG__
  }
})

describe('resolveApiConfig', () => {
  it('prioritizes runtime config over build-time env', () => {
    const config = resolveApiConfig({
      env: {
        VITE_API_URL: 'https://build.example.com/api/v1',
      },
      runtimeConfig: {
        apiUrl: 'https://runtime.example.com/api/v1',
      },
    })

    expect(config.baseURL).toBe('https://runtime.example.com/api/v1')
  })

  it('uses build-time env when runtime config is missing', () => {
    const config = resolveApiConfig({
      env: {
        VITE_API_URL: 'https://build.example.com/api/v1',
      },
    })

    expect(config.baseURL).toBe('https://build.example.com/api/v1')
  })

  it('enables logging only when VITE_ENABLE_LOGGING is true', () => {
    expect(
      resolveApiConfig({
        env: { VITE_ENABLE_LOGGING: 'true' },
      }).enableLogging,
    ).toBe(true)

    expect(
      resolveApiConfig({
        env: {},
      }).enableLogging,
    ).toBe(false)
  })

  it('falls back to localhost when no config source is available', () => {
    const config = resolveApiConfig({
      env: {},
    })

    expect(config.baseURL).toBe('http://localhost:3030/api/v1')
  })

  it('uses numeric runtime config values when available', () => {
    window.__COGCS_CONFIG__ = {
      apiUrl: 'https://runtime.example.com/api/v1',
      apiTimeout: '2500',
      apiRetryAttempts: '5',
      apiRetryDelay: '750',
    }

    const config = resolveApiConfig({
      env: {
        VITE_API_URL: 'https://build.example.com/api/v1',
        VITE_API_TIMEOUT: '10000',
        VITE_API_RETRY_ATTEMPTS: '3',
        VITE_API_RETRY_DELAY: '1000',
      },
      runtimeConfig: readRuntimeConfig(),
    })

    expect(config).toMatchObject({
      baseURL: 'https://runtime.example.com/api/v1',
      timeout: 2500,
      retryAttempts: 5,
      retryDelay: 750,
    })
  })
})

describe('readRuntimeConfig', () => {
  it('reads runtime config safely from window', () => {
    window.__COGCS_CONFIG__ = {
      apiUrl: 'https://runtime.example.com/api/v1',
    }

    expect(readRuntimeConfig()).toMatchObject({
      apiUrl: 'https://runtime.example.com/api/v1',
    })
  })

  it('returns undefined when runtime config is missing', () => {
    expect(readRuntimeConfig()).toBeUndefined()
  })

  it('returns undefined when window is not available', () => {
    vi.stubGlobal('window', undefined)

    expect(readRuntimeConfig()).toBeUndefined()
  })
})
