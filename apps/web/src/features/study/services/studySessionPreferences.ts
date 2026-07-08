import type { StoredSessionSnapshot } from '../domain/sessionGamification'

const PREFERENCES_KEY = 'openflaskcards:study:preferences'
const SESSION_HISTORY_PREFIX = 'openflaskcards:study:last-session:'

export interface StudySessionPreferences {
  soundEnabled: boolean
  autoFlipEnabled: boolean
  autoFlipSeconds: number
}

const DEFAULT_PREFERENCES: StudySessionPreferences = {
  soundEnabled: false,
  autoFlipEnabled: false,
  autoFlipSeconds: 8,
}

export function getStudySessionPreferences(): StudySessionPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFERENCES

  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<StudySessionPreferences>
    return {
      soundEnabled: parsed.soundEnabled ?? DEFAULT_PREFERENCES.soundEnabled,
      autoFlipEnabled:
        parsed.autoFlipEnabled ?? DEFAULT_PREFERENCES.autoFlipEnabled,
      autoFlipSeconds:
        parsed.autoFlipSeconds ?? DEFAULT_PREFERENCES.autoFlipSeconds,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveStudySessionPreferences(
  preferences: StudySessionPreferences,
): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

export function getLastSessionSnapshot(
  deckId: string,
): StoredSessionSnapshot | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(`${SESSION_HISTORY_PREFIX}${deckId}`)
    if (!raw) return null
    return JSON.parse(raw) as StoredSessionSnapshot
  } catch {
    return null
  }
}

export function saveLastSessionSnapshot(snapshot: StoredSessionSnapshot): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    `${SESSION_HISTORY_PREFIX}${snapshot.deckId}`,
    JSON.stringify(snapshot),
  )
}
