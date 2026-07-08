import { describe, expect, it } from 'vitest'
import {
  AbortError,
  ApiError,
  NetworkError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './apiErrors'
import { getUserFacingErrorMessage } from './userFacingErrors'

const t = (key: string) => `translated:${key}`

describe('getUserFacingErrorMessage', () => {
  it('replaces technical runtime messages with a generic unexpected error', () => {
    const message = getUserFacingErrorMessage(
      new Error("Cannot read properties of undefined (reading '_retryCount')"),
      {
        t,
        fallbackKey: 'dashboard:errors.loadDecks',
      },
    )

    expect(message).toBe('Something went wrong. Please try again.')
  })

  it('maps transport failures to stable common keys', () => {
    expect(
      getUserFacingErrorMessage(new NetworkError(), {
        t,
        fallbackKey: 'dashboard:errors.loadDecks',
      }),
    ).toBe("Can't reach the server. Check your connection and try again.")

    expect(
      getUserFacingErrorMessage(new TimeoutError(), {
        t,
        fallbackKey: 'dashboard:errors.loadDecks',
      }),
    ).toBe('The request took too long. Please try again.')

    expect(
      getUserFacingErrorMessage(new ServerError(), {
        t,
        fallbackKey: 'dashboard:errors.loadDecks',
      }),
    ).toBe("The server couldn't complete your request. Please try again.")
  })

  it('uses fallback for explicit cancellation without showing network error to user', () => {
    const message = getUserFacingErrorMessage(new AbortError(), {
      t,
      fallbackKey: 'dashboard:errors.loadDecks',
    })

    expect(message).toBe("Couldn't load your decks. Please try again.")
  })

  it('keeps the first validation message when validation details are structured', () => {
    const message = getUserFacingErrorMessage(
      new ValidationError('Validation failed', {
        email: ['Email already registered'],
      }),
      {
        t,
        fallbackKey: 'auth:register.defaultError',
      },
    )

    expect(message).toBe('Email already registered')
  })

  it('uses the configured fallback for authentication failures', () => {
    const message = getUserFacingErrorMessage(
      new ApiError('Authentication failed', 401),
      {
        t,
        fallbackKey: 'auth:login.defaultError',
      },
    )

    expect(message).toBe('Something went wrong. Please try again.')
  })

  it('maps the documented study limit conflict to the dedicated study message', () => {
    const message = getUserFacingErrorMessage(
      new ApiError('Daily new cards limit reached for this deck today', 409),
      {
        t,
        fallbackKey: 'dashboard:errors.submitReview',
      },
    )

    expect(message).toBe(
      'Daily new cards limit reached! This review was not saved.',
    )
  })
})
