import { renderHook as rtlRenderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isSelectionSpeechShortcut,
  resolveSelectedText,
  useSelectionSpeech,
} from './useSelectionSpeech'

let unmountCurrent: (() => void) | undefined

function renderHook(...args: Parameters<typeof rtlRenderHook>) {
  const result = rtlRenderHook(...args)
  unmountCurrent = result.unmount
  return result
}

const showToastMock = vi.fn()
const dismissToastMock = vi.fn()
const synthesizeSelectionMock = vi.fn()
const playBase64AudioMock = vi.fn()
const stopAudioMock = vi.fn()
let isPlaying = false

vi.mock('@/shared/providers/NotificationProvider', () => ({
  useNotification: () => ({
    showToast: showToastMock,
    dismissToast: dismissToastMock,
  }),
}))

vi.mock('@/shared/services/ttsService', () => ({
  synthesizeSelection: (text: string) => synthesizeSelectionMock(text),
}))

vi.mock('./useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying,
    playBase64Audio: playBase64AudioMock,
    stopAudio: stopAudioMock,
  }),
}))

function fireShortcut(options: { shiftKey?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 's',
    code: 'KeyS',
    altKey: true,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
  })
  window.dispatchEvent(event)
}

function stubSelection(text: string | null) {
  vi.spyOn(window, 'getSelection').mockReturnValue(
    text === null ? null : ({ toString: () => text } as unknown as Selection),
  )
}

describe('isSelectionSpeechShortcut', () => {
  it('matches Alt+S using physical key code', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ß',
      code: 'KeyS',
      altKey: true,
      bubbles: true,
    })
    expect(isSelectionSpeechShortcut(event)).toBe(true)
  })

  it('matches Alt+Shift+S as fallback', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'S',
      code: 'KeyS',
      altKey: true,
      shiftKey: true,
      bubbles: true,
    })
    expect(isSelectionSpeechShortcut(event)).toBe(true)
  })

  it('ignores plain S without Alt', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      code: 'KeyS',
      bubbles: true,
    })
    expect(isSelectionSpeechShortcut(event)).toBe(false)
  })
})

describe('resolveSelectedText', () => {
  it('reads selected text from focused inputs', () => {
    const input = document.createElement('input')
    input.value = 'hello world'
    document.body.appendChild(input)
    input.focus()
    input.setSelectionRange(0, 5)

    expect(resolveSelectedText()).toBe('hello')

    input.remove()
  })
})

describe('useSelectionSpeech', () => {
  beforeEach(() => {
    isPlaying = false
    showToastMock.mockReset()
    dismissToastMock.mockReset()
    synthesizeSelectionMock.mockReset()
    playBase64AudioMock.mockReset()
    stopAudioMock.mockReset()
  })

  afterEach(() => {
    unmountCurrent?.()
    unmountCurrent = undefined
    vi.restoreAllMocks()
  })

  it('reads the currently selected text aloud when the shortcut fires', async () => {
    stubSelection('hello world')
    synthesizeSelectionMock.mockResolvedValue('base64audio')
    renderHook(() => useSelectionSpeech())

    fireShortcut()
    await vi.waitFor(() => {
      expect(synthesizeSelectionMock).toHaveBeenCalledWith('hello world')
    })

    expect(playBase64AudioMock).toHaveBeenCalledWith('base64audio')
    expect(dismissToastMock).toHaveBeenCalled()
  })

  it('shows a toast and does not call the TTS service when nothing is selected', () => {
    stubSelection('')
    renderHook(() => useSelectionSpeech())

    fireShortcut()

    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('shows a toast and does not call the TTS service when selection is only whitespace', () => {
    stubSelection('   ')
    renderHook(() => useSelectionSpeech())

    fireShortcut()

    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('shows an error toast when synthesis fails', async () => {
    stubSelection('hello world')
    synthesizeSelectionMock.mockRejectedValue(new Error('boom'))
    renderHook(() => useSelectionSpeech())

    fireShortcut()

    await vi.waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(expect.any(String), 'error')
    })
    expect(playBase64AudioMock).not.toHaveBeenCalled()
  })

  it('stops playback instead of re-synthesizing when audio is already playing', () => {
    isPlaying = true
    stubSelection('hello world')
    renderHook(() => useSelectionSpeech())

    fireShortcut()

    expect(stopAudioMock).toHaveBeenCalled()
    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      'Playback stopped.',
      'info',
      2000,
    )
  })

  it('ignores the shortcut when the modifier key is not held', () => {
    stubSelection('hello world')
    renderHook(() => useSelectionSpeech())

    const event = new KeyboardEvent('keydown', {
      key: 's',
      code: 'KeyS',
      bubbles: true,
    })
    window.dispatchEvent(event)

    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
  })

  it('ignores Alt held with a different key', () => {
    stubSelection('hello world')
    renderHook(() => useSelectionSpeech())

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      altKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event)

    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
  })

  it('shows a toast when getSelection returns null', () => {
    stubSelection(null)
    renderHook(() => useSelectionSpeech())

    fireShortcut()

    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('removes the keydown listener on unmount', () => {
    stubSelection('hello world')
    const { unmount } = renderHook(() => useSelectionSpeech())
    unmount()
    unmountCurrent = undefined

    fireShortcut()

    expect(synthesizeSelectionMock).not.toHaveBeenCalled()
  })
})
