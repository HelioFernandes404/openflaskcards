import { useEffect, useMemo, useState } from 'react'
import { Eye, RotateCcw } from 'lucide-react'
import type { Card } from '../../types/card'
import { buildPreviewBack, buildPreviewFront } from '../../domain/cardPreview'
import { CardFrontDisplay } from '@/features/study/components/CardFrontDisplay'
import { CardBackDisplay } from '@/features/study/components/CardBackDisplay'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Card as SurfaceCard } from '@/shared/components/card'
import { cn } from '@/shared/utils'

interface CardPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  card: Card
  frontText: string
  backText: string
  imagemUrl?: string
  isDirty?: boolean
}

export function CardPreviewModal({
  isOpen,
  onClose,
  card,
  frontText,
  backText,
  imagemUrl,
  isDirty = false,
}: CardPreviewModalProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    if (isOpen) setIsFlipped(false)
  }, [isOpen, card.id])

  const previewDraft = useMemo(
    () => ({
      front: frontText,
      back: backText,
      fonetica: card.phonetic ?? '',
      imagemUrl,
    }),
    [card.phonetic, frontText, backText, imagemUrl],
  )

  const previewFront = useMemo(
    () => buildPreviewFront(card, previewDraft),
    [card, previewDraft],
  )

  const previewBack = useMemo(
    () => buildPreviewBack(card, previewDraft),
    [card, previewDraft],
  )

  const hasContent = frontText.trim().length > 0 || backText.trim().length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Study preview"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-on-surface-variant">
          See how this card appears during a study session.
          {isDirty && (
            <span className="ml-1 text-on-surface">
              Includes unsaved edits.
            </span>
          )}
        </p>

        {!hasContent ? (
          <div className="rounded-xl border border-dashed border-outline bg-surface-container-lowest px-6 py-10 text-center">
            <Eye
              size={20}
              className="mx-auto mb-3 text-on-surface-variant"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-on-surface">Nothing to preview yet</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Add front or back text to see the study layout.
            </p>
          </div>
        ) : (
          <SurfaceCard
            className={cn(
              'flex min-h-[320px] flex-col gap-0 overflow-hidden border-outline py-0',
              isFlipped ? 'max-h-[70vh]' : '',
            )}
          >
            <div
              className={cn(
                'min-h-0 transition-all duration-300',
                isFlipped
                  ? 'shrink-0 overflow-hidden border-b border-outline-variant'
                  : 'flex flex-1 flex-col',
              )}
            >
              {isFlipped && (
                <div className="px-4 pt-3 pb-1">
                  <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
                    Question
                  </span>
                </div>
              )}
              <CardFrontDisplay card={previewFront} compact={isFlipped} />
            </div>

            {isFlipped && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-t border-outline-variant px-4 pt-3">
                  <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
                    Answer
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <CardBackDisplay card={previewBack} autoPlayAudio={false} />
                </div>
              </div>
            )}
          </SurfaceCard>
        )}

        <div className="flex gap-2">
          {hasContent && (
            <Button
              type="button"
              className="flex-1 cursor-pointer"
              onClick={() => setIsFlipped((flipped) => !flipped)}
            >
              {isFlipped ? (
                <>
                  <RotateCcw size={16} strokeWidth={1.5} />
                  Back to question
                </>
              ) : (
                <>
                  <Eye size={16} strokeWidth={1.5} />
                  Show answer
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="neutral"
            onClick={onClose}
            className={cn('cursor-pointer', hasContent ? '' : 'flex-1')}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
