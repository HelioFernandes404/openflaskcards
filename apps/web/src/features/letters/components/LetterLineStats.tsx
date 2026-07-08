import { AlertTriangle } from 'lucide-react'
import type { LyricsLineStats } from '../domain/alignLyricsLines'

interface LetterLineStatsProps {
  stats: LyricsLineStats
}

export function LetterLineStats({ stats }: LetterLineStatsProps) {
  const { englishCount, portugueseCount, hasMismatch } = stats

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant"
      data-testid="letter-line-stats"
    >
      <span>
        {englishCount} {englishCount === 1 ? 'line' : 'lines'} · Original
      </span>
      <span aria-hidden>·</span>
      <span>
        {portugueseCount} {portugueseCount === 1 ? 'line' : 'lines'} ·
        Translation
      </span>
      {hasMismatch && (
        <span className="inline-flex items-center gap-1 text-warning-600">
          <AlertTriangle size={14} strokeWidth={1.5} aria-hidden />
          Line counts differ — side-by-side view may look misaligned
        </span>
      )}
    </div>
  )
}
