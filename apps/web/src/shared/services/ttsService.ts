import { httpClient } from './apiClient'

/**
 * Synthesizes arbitrary text to speech via the server-backed TTS pipeline
 * and returns the resulting audio as a base64-encoded MP3 string.
 */
export async function synthesizeSelection(text: string): Promise<string> {
  const { data } = await httpClient.post<{ audioBase64: string }>(
    '/cards/audio',
    { text },
  )
  return data.audioBase64
}
