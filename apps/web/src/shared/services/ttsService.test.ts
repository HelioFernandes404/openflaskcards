import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { synthesizeSelection } from './ttsService'

describe('synthesizeSelection', () => {
  it('posts the given text and returns the base64 audio from the response', async () => {
    server.use(
      http.post('*/api/v1/cards/audio', async ({ request }) => {
        const body = (await request.json()) as { text: string }
        expect(body.text).toBe('hello world')
        return HttpResponse.json({ audioBase64: 'base64audio' })
      }),
    )

    const result = await synthesizeSelection('hello world')

    expect(result).toBe('base64audio')
  })

  it('propagates an error response instead of swallowing it', async () => {
    server.use(
      http.post('*/api/v1/cards/audio', () =>
        HttpResponse.json(
          { code: 'TTS_UNAVAILABLE', message: 'tts service not configured' },
          { status: 503 },
        ),
      ),
    )

    await expect(synthesizeSelection('hello world')).rejects.toMatchObject({
      statusCode: 503,
    })
  })
})
