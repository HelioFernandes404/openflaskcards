import type { ReactNode } from 'react'
import type { CardFront } from '@/features/cards/types/card'
import { Badge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { InlineMarkdown } from '@/shared/components/inline-markdown'
import { ExpandableMarkdown } from '@/shared/components/expandable-markdown'
import { StudyCardImage } from './StudyCardImage'
import { StudyAudioButton } from './StudyAudioButton'
import { useStudyCardAudio } from '../hooks/useStudyCardAudio'

interface CardFrontDisplayProps {
  card: CardFront
  compact?: boolean
}

function StudyPromptLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
      {children}
    </span>
  )
}

/**
 * CardFrontDisplay - Displays the challenge side of a card (no spoilers)
 */
export function CardFrontDisplay({
  card,
  compact = false,
}: CardFrontDisplayProps) {
  const { isPlaying, play, hasAudio, loading } = useStudyCardAudio({
    cardId: card.id,
    ttsEnabled: card.ttsEnabled,
    audioUrl: card.audioUrl,
    autoPlay: card.ttsEnabled && !compact,
  })

  if (compact) {
    return (
      <div className="px-4 pb-3 pt-1 text-center">
        <p className="line-clamp-2 font-serif text-lg font-normal leading-snug text-on-surface md:text-xl">
          <InlineMarkdown text={card.front} />
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-4 text-center md:gap-5 md:p-5">
      <StudyPromptLabel>Recall the pronunciation</StudyPromptLabel>

      {card.imagemUrl && (
        <StudyCardImage src={card.imagemUrl} alt={card.front} variant="front" />
      )}

      <div className="max-w-2xl px-2 font-serif text-3xl font-normal leading-tight text-on-surface md:text-4xl">
        <ExpandableMarkdown text={card.front} />
      </div>

      {card.ttsEnabled &&
        (loading ? (
          <Spinner size="sm" />
        ) : hasAudio ? (
          <StudyAudioButton isPlaying={isPlaying} onClick={play} />
        ) : null)}

      {card.state === 'new' && (
        <Badge variant="neutral" className="uppercase">
          New Card
        </Badge>
      )}
    </div>
  )
}
