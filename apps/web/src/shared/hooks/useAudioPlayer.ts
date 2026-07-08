import { useRef, useState, useCallback } from 'react'

interface UseAudioPlayerReturn {
  isPlaying: boolean
  playBase64Audio: (base64: string) => void
  stopAudio: () => void
}

const LOG_PREFIX = '🔊 [useAudioPlayer]'
const PREVIEW_LEN = 100
const isAudioDebug = import.meta.env.DEV

function audioLog(...args: unknown[]) {
  if (isAudioDebug) console.log(...args)
}

function audioError(...args: unknown[]) {
  if (isAudioDebug) console.error(...args)
}

function audioGroup(...args: unknown[]) {
  if (isAudioDebug) console.groupCollapsed(...args)
}

function audioGroupEnd() {
  if (isAudioDebug) console.groupEnd()
}

function preview(s?: string, n = PREVIEW_LEN) {
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function audioSnapshot(audio: HTMLAudioElement | null) {
  if (!audio) return null
  return {
    paused: audio.paused,
    ended: audio.ended,
    currentTime: Number.isFinite(audio.currentTime)
      ? +audio.currentTime.toFixed(3)
      : audio.currentTime,
    duration: Number.isFinite(audio.duration)
      ? +audio.duration.toFixed(3)
      : audio.duration,
    readyState: audio.readyState, // 0..4
    networkState: audio.networkState, // 0..3
    srcLen: audio.src?.length ?? 0,
    errorCode: audio.error?.code ?? null, // 1..4
  }
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioLog(`${LOG_PREFIX} stopAudio`, {
        before: audioSnapshot(audioRef.current),
      })

      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null

      audioLog(`${LOG_PREFIX} stopAudio`, { after: audioRef.current })
    }
    setIsPlaying(false)
  }, [])

  const playBase64Audio = useCallback(
    (base64: string) => {
      const playId = Math.random().toString(16).slice(2, 8)
      const t0 = performance.now()
      const t = () => `t+${(performance.now() - t0).toFixed(1)}ms`

      audioGroup(`${LOG_PREFIX} playBase64Audio #${playId}`)
      audioLog(t(), 'called', {
        base64Len: base64?.length ?? 0,
        base64Preview: preview(base64),
      })

      // Stop any currently playing audio
      audioLog(t(), 'stopAudio() - before', {
        currentAudio: audioSnapshot(audioRef.current),
      })
      stopAudio()
      audioLog(t(), 'stopAudio() - after', {
        currentAudio: audioRef.current,
      })

      try {
        // Create audio element with base64 data URI
        const dataUri = `data:audio/mpeg;base64,${base64}`
        audioLog(t(), 'dataUri created', {
          dataUriLen: dataUri.length,
          dataUriPreview: preview(dataUri),
        })

        const audio = new Audio(dataUri)
        audioRef.current = audio
        audioLog(t(), 'Audio element created', {
          audio: audioSnapshot(audio),
        })

        audio.onplay = () => {
          audioLog(t(), 'event:onplay', { audio: audioSnapshot(audio) })
          setIsPlaying(true)
        }

        audio.onended = () => {
          audioLog(t(), 'event:onended', { audio: audioSnapshot(audio) })
          setIsPlaying(false)
          audioRef.current = null
          audioLog(t(), 'audioRef cleared (ended)')
        }

        audio.onerror = (e) => {
          audioError(t(), 'event:onerror', {
            event: e,
            audio: audioSnapshot(audio),
          })
          setIsPlaying(false)
          audioRef.current = null
          audioLog(t(), 'audioRef cleared (error)')
        }

        audioLog(t(), 'Calling audio.play()', {
          audio: audioSnapshot(audio),
        })
        audio
          .play()
          .then(() => {
            audioLog(t(), 'audio.play() resolved', {
              audio: audioSnapshot(audio),
            })
          })
          .catch((err) => {
            audioError(t(), 'audio.play() rejected', {
              err,
              audio: audioSnapshot(audio),
            })
            setIsPlaying(false)
            audioRef.current = null
            audioLog(t(), 'audioRef cleared (play reject)')
          })
      } catch (err) {
        audioError(t(), 'Exception in playBase64Audio', { err })
        setIsPlaying(false)
      } finally {
        audioGroupEnd()
      }
    },
    [stopAudio],
  )

  return { isPlaying, playBase64Audio, stopAudio }
}
