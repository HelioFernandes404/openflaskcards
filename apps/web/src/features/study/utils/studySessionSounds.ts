import type { ReviewRating } from '../domain/sessionGamification'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  gain = 0.04,
) {
  const context = getAudioContext()
  if (!context) return

  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency
  gainNode.gain.value = gain

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  const now = context.currentTime
  gainNode.gain.setValueAtTime(gain, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)

  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000)
}

export function playStudySessionSound(
  event: 'flip' | 'combo' | ReviewRating,
  enabled: boolean,
) {
  if (!enabled) return

  void getAudioContext()?.resume()

  switch (event) {
    case 'flip':
      playTone(440, 90, 'triangle', 0.03)
      break
    case 'combo':
      playTone(660, 120, 'sine', 0.05)
      playTone(880, 120, 'sine', 0.04)
      break
    case 1:
      playTone(180, 140, 'sawtooth', 0.03)
      break
    case 2:
      playTone(260, 100, 'triangle', 0.03)
      break
    case 3:
      playTone(520, 110, 'sine', 0.04)
      break
    case 4:
      playTone(740, 130, 'sine', 0.05)
      break
  }
}
