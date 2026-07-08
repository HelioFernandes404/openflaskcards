export const CHATGPT_BASE_URL = 'https://chatgpt.com'

/** Browsers vary; stay conservative so the link always opens. */
export const CHATGPT_URL_MAX_LENGTH = 1800

export interface ChatGptUrlOptions {
  /** Temporary chats cannot generate images — keep false for Prompt Help. */
  temporaryChat?: boolean
}

export function buildChatGptPromptUrl(
  prompt: string,
  options: ChatGptUrlOptions = {},
): string {
  const { temporaryChat = false } = options
  const params = new URLSearchParams()
  params.set('q', prompt)
  if (temporaryChat) {
    params.set('temporary-chat', 'true')
  }
  return `${CHATGPT_BASE_URL}/?${params.toString()}`
}

export function canOpenChatGptWithPrompt(prompt: string): boolean {
  if (!prompt.trim()) return false
  return buildChatGptPromptUrl(prompt).length <= CHATGPT_URL_MAX_LENGTH
}
