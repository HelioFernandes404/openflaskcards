import { Layers, Music2 } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import { Button } from '@/shared/components/button'
import type { LyricsLineStats } from '../domain/alignLyricsLines'

interface LetterViewHeroProps {
  artist: string
  lineStats: LyricsLineStats
  linkedDeckName?: string
  onStudyDeck?: () => void
}

export function LetterViewHero({
  artist,
  lineStats,
  linkedDeckName,
  onStudyDeck,
}: LetterViewHeroProps) {
  return (
    <Card className="mb-5" data-testid="letter-view-hero">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-outline bg-surface-container-high">
            <Music2
              size={20}
              className="text-on-surface-variant"
              strokeWidth={1.5}
            />
          </div>
          <div className="min-w-0">
            {artist ? (
              <p className="font-display text-lg font-semibold text-on-surface">
                {artist}
              </p>
            ) : (
              <p className="font-display text-lg font-semibold text-on-surface-variant">
                Unknown artist
              </p>
            )}
            <p className="mt-1 text-sm text-on-surface-variant">
              {lineStats.pairedCount}{' '}
              {lineStats.pairedCount === 1 ? 'line' : 'lines'}
              {lineStats.hasMismatch ? ' · translations may be misaligned' : ''}
            </p>
          </div>
        </div>

        {linkedDeckName && onStudyDeck && (
          <Button
            type="button"
            variant="neutral"
            className="gap-2 self-start sm:self-center"
            data-testid="letter-view-study-deck"
            onClick={onStudyDeck}
          >
            <Layers size={16} />
            Study {linkedDeckName}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
