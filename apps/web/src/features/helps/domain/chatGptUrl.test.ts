import { describe, expect, it } from 'vitest'
import {
  buildChatGptPromptUrl,
  canOpenChatGptWithPrompt,
  CHATGPT_BASE_URL,
} from './chatGptUrl'

describe('buildChatGptPromptUrl', () => {
  it('prefills the prompt via the q parameter', () => {
    const url = buildChatGptPromptUrl('Target word: "apple"')
    expect(url.startsWith(`${CHATGPT_BASE_URL}/?`)).toBe(true)
    expect(url).toContain('q=Target+word%3A+%22apple%22')
  })

  it('opens a normal chat by default so image generation works', () => {
    const url = buildChatGptPromptUrl('hello')
    expect(url).not.toContain('temporary-chat')
  })

  it('can opt into temporary chat', () => {
    const url = buildChatGptPromptUrl('hello', { temporaryChat: true })
    expect(url).toContain('temporary-chat=true')
  })
})

describe('canOpenChatGptWithPrompt', () => {
  it('returns false for blank prompts', () => {
    expect(canOpenChatGptWithPrompt('   ')).toBe(false)
  })

  it('returns true for normal prompt lengths', () => {
    expect(canOpenChatGptWithPrompt('Create an educational illustration')).toBe(
      true,
    )
  })
})
