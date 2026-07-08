import { useCallback, useEffect, useRef, useState } from 'react'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { synthesizeSelection } from '@/shared/services/ttsService'
import { useAudioPlayer } from './useAudioPlayer'

export function isSelectionSpeechShortcut(event: KeyboardEvent): boolean {
  if (!event.altKey || event.ctrlKey || event.metaKey) return false
  return event.code === 'KeyS'
}

export function resolveSelectedText(): string {
  const active = document.activeElement
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start !== null && end !== null && start !== end) {
      return active.value.slice(start, end).trim()
    }
  }
  return window.getSelection()?.toString().trim() ?? ''
}

/**
 * Reads the currently selected text aloud via the server TTS pipeline
 * when the user presses Alt+S (or Alt+Shift+S), from anywhere in the
 * authenticated app.
 */
export function useSelectionSpeech() {
  const { isPlaying, playBase64Audio, stopAudio } = useAudioPlayer()
  const { showToast, dismissToast } = useNotification()
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const synthesizingRef = useRef(false)

  const handleShortcut = useCallback(async () => {
    if (isPlaying) {
      stopAudio()
      dismissToast()
      showToast('Playback stopped.', 'info', 2000)
      return
    }

    if (synthesizingRef.current) return

    const text = resolveSelectedText()
    if (!text) {
      showToast(
        'Selecione um texto para ouvir. Atalho: Alt+S (ou Alt+Shift+S).',
        'error',
      )
      return
    }

    synthesizingRef.current = true
    setIsSynthesizing(true)
    showToast('Generating audio…', 'info', 0)

    try {
      const audio = await synthesizeSelection(text)
      dismissToast()
      playBase64Audio(audio)
    } catch (err) {
      showToast(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'shared:errors.readSelection',
        }),
        'error',
      )
    } finally {
      synthesizingRef.current = false
      setIsSynthesizing(false)
    }
  }, [dismissToast, isPlaying, playBase64Audio, showToast, stopAudio])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isSelectionSpeechShortcut(event)) return

      event.preventDefault()
      event.stopPropagation()
      void handleShortcut()
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [handleShortcut])

  return { isPlaying, isSynthesizing }
}
