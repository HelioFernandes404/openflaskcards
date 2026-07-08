import type { ReactNode } from 'react'
import type { CardBack } from '@/features/cards/types/card'
import { ExpandableMarkdown } from '@/shared/components/expandable-markdown'
import { StudyAudioButton } from './StudyAudioButton'
import { useStudyCardAudio } from '../hooks/useStudyCardAudio'

interface CardBackDisplayProps {
  card: CardBack
  autoPlayAudio?: boolean
}

function StudyAnswerSection({
  label,
  action,
  children,
}: {
  label: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-3">
        <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

/**
 * CardBackDisplay - Displays the feedback side of a card (complete solution)
 */
export function CardBackDisplay({
  card,
  autoPlayAudio = true,
}: CardBackDisplayProps) {
  const { isPlaying, play, hasAudio } = useStudyCardAudio({
    cardId: card.id,
    ttsEnabled: Boolean(card.ttsAudio),
    audioUrl: card.audioUrl,
    ttsAudio: card.ttsAudio,
    autoPlay: autoPlayAudio,
  })

  const audioButton = hasAudio ? (
    <StudyAudioButton isPlaying={isPlaying} onClick={play} />
  ) : null

  return (
    <div className="flex min-h-0 flex-col items-center gap-4 p-4 text-center md:gap-5 md:p-5">
      <div className="w-full max-w-lg space-y-4">
        {card.phonetic && (
          <StudyAnswerSection label="Pronunciation" action={audioButton}>
            <p className="font-mono text-lg font-medium text-on-surface md:text-xl">
              {card.phonetic}
            </p>
          </StudyAnswerSection>
        )}

        <StudyAnswerSection
          label="Meaning"
          action={!card.phonetic ? audioButton : undefined}
        >
          <div className="font-serif text-lg font-normal leading-relaxed text-on-surface md:text-xl">
            <ExpandableMarkdown text={card.back} />
          </div>
        </StudyAnswerSection>
      </div>
    </div>
  )
}
