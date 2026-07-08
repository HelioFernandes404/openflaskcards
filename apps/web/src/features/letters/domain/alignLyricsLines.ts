export interface LyricsLine {
  id: string
  english: string
  portuguese: string
}

export interface LyricsLineStats {
  englishCount: number
  portugueseCount: number
  pairedCount: number
  hasMismatch: boolean
}

/** Pair original and translation lines for side-by-side display. */
export function alignLyricsLines(
  original: string,
  translation: string,
): LyricsLine[] {
  const englishLines = original.split('\n')
  const portugueseLines = translation.split('\n')
  const count = Math.max(englishLines.length, portugueseLines.length)

  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    english: englishLines[index] ?? '',
    portuguese: portugueseLines[index] ?? '',
  }))
}

export function getLyricsLineStats(
  original: string,
  translation: string,
): LyricsLineStats {
  const englishCount = original.split('\n').length
  const portugueseCount = translation.split('\n').length

  return {
    englishCount,
    portugueseCount,
    pairedCount: Math.max(englishCount, portugueseCount),
    hasMismatch: englishCount !== portugueseCount,
  }
}

export function getLetterPreview(originalLyrics: string): string {
  return (
    originalLyrics
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''
  )
}
