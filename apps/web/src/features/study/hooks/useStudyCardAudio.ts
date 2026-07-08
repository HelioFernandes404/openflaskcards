import { useCallback, useEffect, useState } from 'react'
import { ApiStudyService } from '../services/ApiStudyService'
import { useAudioPlayer } from '@/shared/hooks/useAudioPlayer'

const studyService = new ApiStudyService()

interface UseStudyCardAudioOptions {
  cardId: string
  ttsEnabled?: boolean
  audioUrl?: string
  ttsAudio?: string
  autoPlay?: boolean
}

function playUrlAudio(url: string, playBase64Audio: (base64: string) => void) {
  if (!url.startsWith('http') && !url.startsWith('data:')) {
    playBase64Audio(url)
    return
  }

  const audio = new Audio(url)
  audio.play().catch((err) => {
    console.error('Audio play failed:', err)
  })
}

export function useStudyCardAudio({
  cardId,
  ttsEnabled = true,
  audioUrl,
  ttsAudio: initialTtsAudio,
  autoPlay = false,
}: UseStudyCardAudioOptions) {
  const { isPlaying, playBase64Audio, stopAudio } = useAudioPlayer()
  const [ttsAudio, setTtsAudio] = useState(initialTtsAudio)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTtsAudio(initialTtsAudio)
  }, [initialTtsAudio, cardId])

  useEffect(() => {
    if (!ttsEnabled || initialTtsAudio) return

    let cancelled = false
    setLoading(true)

    studyService
      .getCardAudio(cardId)
      .then((base64) => {
        if (!cancelled) setTtsAudio(base64)
      })
      .catch((err) => {
        console.error('Failed to load card audio:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      stopAudio()
    }
  }, [cardId, ttsEnabled, initialTtsAudio, stopAudio])

  useEffect(() => {
    if (!autoPlay || !ttsEnabled) return

    if (ttsAudio) {
      const timeout = setTimeout(() => {
        playBase64Audio(ttsAudio)
      }, 300)
      return () => {
        clearTimeout(timeout)
        stopAudio()
      }
    }

    if (audioUrl && !ttsAudio && !loading) {
      const timeout = setTimeout(() => {
        playUrlAudio(audioUrl, playBase64Audio)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [
    autoPlay,
    audioUrl,
    ttsEnabled,
    loading,
    playBase64Audio,
    stopAudio,
    ttsAudio,
  ])

  const play = useCallback(() => {
    if (ttsAudio) {
      playBase64Audio(ttsAudio)
      return
    }
    if (audioUrl) {
      playUrlAudio(audioUrl, playBase64Audio)
    }
  }, [audioUrl, playBase64Audio, ttsAudio])

  const hasAudio = ttsEnabled && Boolean(ttsAudio || audioUrl)

  return {
    isPlaying,
    play,
    hasAudio,
    loading,
  }
}
