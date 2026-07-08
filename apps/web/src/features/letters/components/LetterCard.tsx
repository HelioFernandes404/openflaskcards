import { Music2 } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import {
  getLetterPreview,
  getLyricsLineStats,
} from '../domain/alignLyricsLines'
import type { Letter } from '../types/letter'

interface LetterCardProps {
  letter: Letter
  deckName?: string
  onOpen: (letterId: string) => void
}

export function LetterCard({ letter, deckName, onOpen }: LetterCardProps) {
  const preview = getLetterPreview(letter.originalLyrics)
  const lineStats = getLyricsLineStats(
    letter.originalLyrics,
    letter.translation,
  )

  const meta = [letter.artist, deckName ? `Deck: ${deckName}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card
      className="group h-full cursor-pointer transition-all hover:border-outline-strong"
      data-testid={`letter-item-${letter.id}`}
      onClick={() => onOpen(letter.id)}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-outline bg-surface-container-high">
            <Music2
              size={18}
              className="text-on-surface-variant"
              strokeWidth={1.5}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-2 font-display text-base font-semibold text-on-surface"
              title={letter.title}
            >
              {letter.title}
            </h3>
            {meta && (
              <p className="mt-1 line-clamp-1 text-sm text-on-surface-variant">
                {meta}
              </p>
            )}
          </div>
        </div>

        {preview && (
          <p className="line-clamp-2 font-display text-sm leading-relaxed text-on-surface-variant italic">
            {preview}
          </p>
        )}

        <p className="mt-auto font-mono text-2xs uppercase tracking-widest text-on-surface-variant">
          {lineStats.pairedCount}{' '}
          {lineStats.pairedCount === 1 ? 'line' : 'lines'}
          {lineStats.hasMismatch ? ' · misaligned' : ''}
        </p>
      </CardContent>
    </Card>
  )
}
