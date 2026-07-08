import { useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import {
  X,
  CheckCircle2,
  ArrowLeft,
  Timer,
  AlertCircle,
  Edit,
} from 'lucide-react'
import { Button } from '@/shared/components/button'
import { Card } from '@/shared/components/card'
import { Skeleton, SkeletonText } from '@/shared/components/skeleton'
import { AnimatedPage, MotionFade } from '@/shared/components/motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/tooltip'
import { EditCardModal } from '@/features/cards/components/EditCardModal'
import { CardFrontDisplay } from '../components/CardFrontDisplay'
import { CardBackDisplay } from '../components/CardBackDisplay'
import { ReviewRatingBar } from '../components/ReviewRatingBar'
import { CopyCardCliButton } from '../components/CopyCardCliButton'
import { StudyCardSectionHeader } from '../components/StudyCardSectionHeader'
import { StudyAutoFlipControls } from '../components/StudyAutoFlipControls'
import { StudyComboIndicator } from '../components/StudyComboIndicator'
import { StudyRatingFlyout } from '../components/StudyRatingFlyout'
import { StudyRetrievabilityBar } from '../components/StudyRetrievabilityBar'
import { StudySessionSummaryCard } from '../components/StudySessionSummaryCard'
import { StudySoundToggle } from '../components/StudySoundToggle'
import { useAutoFitZoom } from '../hooks/useAutoFitZoom'
import { useStudySession } from '../hooks/useStudySession'
import { formatStudyTimer } from '../domain/sessionGamification'
import { ScalableContent } from '../components/ScalableContent'
import { cn } from '@/shared/utils'

export function StudySession() {
  const { deckId } = useParams({ strict: false })
  const session = useStudySession(deckId)

  useEffect(() => {
    const name = session.deck?.name
    document.title = name ? `Study: ${name} — Flashcards` : 'Study — Flashcards'
    return () => {
      document.title = 'Flashcards'
    }
  }, [session.deck?.name])

  const { scale, contentRef, viewportRef } = useAutoFitZoom({
    minScale: 0.5,
    reservedHeight: session.isFlipped ? 108 : 88,
    enabled: session.phase === 'active',
    dependencies: [
      session.isFlipped,
      session.currentCardIndex,
      session.isEditOpen,
      session.currentFront?.front,
      session.currentFront?.imagemUrl,
      session.currentFront?.ttsEnabled,
      session.currentBack?.back,
      session.currentBack?.phonetic,
    ],
  })

  if (session.phase === 'loading') {
    return (
      <AnimatedPage className="max-w-3xl mx-auto h-screen flex flex-col p-4 md:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-24 rounded-base" />
          <div className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-5 w-28 rounded-sm" />
            <Skeleton className="h-3 w-36 rounded-sm" />
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-md border border-outline">
            <Skeleton className="size-10 rounded-none" />
            <Skeleton className="h-10 w-[4.25rem] rounded-none border-l border-outline" />
          </div>
        </div>
        <Skeleton className="w-full h-4 rounded-full mb-8" />
        <Card
          className="flex-1 min-h-0 flex flex-col relative overflow-hidden"
          aria-busy="true"
        >
          <div className="flex-1 p-8 flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-8 w-3/4" />
            <SkeletonText lines={2} className="w-full max-w-md" />
          </div>
          <div className="p-4 border-t border-outline">
            <Skeleton className="h-14 w-full rounded-base" />
          </div>
        </Card>
      </AnimatedPage>
    )
  }

  if (session.phase === 'empty') {
    return (
      <AnimatedPage className="flex flex-col items-center justify-center h-screen p-4 md:p-8 overflow-hidden">
        <Card className="p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-success-50 border border-success-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2
              size={40}
              className="text-success-600"
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-3xl font-semibold mb-2">All Done!</h2>
          {session.quotaInfo?.isNewCardsLimitReached ? (
            <>
              <p className="text-on-surface-variant mb-4 font-medium">
                You've reached your daily limit of new cards.
              </p>
              <div className="bg-info-50 border border-info-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-info-600 mb-1">
                  <AlertCircle size={18} strokeWidth={1.5} />
                  <span className="font-semibold">Daily Limit Reached</span>
                </div>
                <p className="text-sm text-info-600/80">
                  {session.quotaInfo.newCardsStudiedToday}/
                  {session.quotaInfo.newCardsDailyLimit} new cards studied today
                </p>
              </div>
            </>
          ) : (
            <p className="text-on-surface-variant mb-8 font-medium">
              No cards due for review in this deck.
            </p>
          )}
          <Button
            className="w-full py-3 text-lg flex items-center justify-center gap-2"
            onClick={session.exit}
          >
            <ArrowLeft size={18} strokeWidth={1.5} /> Back to Dashboard
          </Button>
        </Card>
      </AnimatedPage>
    )
  }

  if (session.phase === 'finished') {
    return (
      <AnimatedPage className="flex flex-col items-center justify-center h-screen p-4 md:p-8 overflow-hidden">
        <StudySessionSummaryCard
          summary={session.sessionSummary!}
          previousSession={session.previousSession}
          onExit={session.exit}
        />
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage
      className="max-w-3xl mx-auto h-screen flex flex-col p-4 md:p-8 overflow-hidden"
      data-testid="study-session-page"
    >
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="neutral"
          data-testid="study-session-quit-button"
          className="p-2 flex items-center gap-2 font-medium px-4"
          onClick={session.exit}
        >
          <X size={18} strokeWidth={1.5} />{' '}
          <span className="hidden sm:inline">Quit</span>
        </Button>

        <div className="flex min-w-0 flex-col items-center gap-1 text-center">
          <h2 className="max-w-[11rem] truncate font-display text-base font-semibold leading-tight tracking-tight text-on-surface sm:max-w-xs sm:text-lg">
            {session.deck?.name}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant tabular-nums">
              Card {session.currentCardIndex + 1} of {session.cardFronts.length}
            </span>
            <StudyComboIndicator combo={session.combo} />
            {session.quotaInfo && session.quotaInfo.newCardsDailyLimit > 0 && (
              <>
                <span className="text-muted" aria-hidden>
                  ·
                </span>
                <span
                  className={cn(
                    'font-mono text-2xs uppercase tracking-wider tabular-nums',
                    session.quotaInfo.isNewCardsLimitReached
                      ? 'text-warning-600'
                      : 'text-on-surface-variant',
                  )}
                >
                  New {session.quotaInfo.newCardsStudiedToday}/
                  {session.quotaInfo.newCardsDailyLimit} today
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-stretch overflow-hidden rounded-md border border-outline bg-surface-container-low">
          <StudySoundToggle
            enabled={session.preferences.soundEnabled}
            onToggle={session.toggleSound}
          />
          <CopyCardCliButton cardId={session.currentFront?.id} />
          <Button
            variant="ghost"
            size="icon"
            data-testid="study-session-edit-button"
            className="size-10 shrink-0 rounded-none border-0 border-r border-outline shadow-none hover:bg-surface-container hover:border-outline"
            onClick={() => void session.openEdit()}
            disabled={session.isLoadingEditCard || !session.currentFront}
            aria-label="Edit card"
          >
            <Edit size={16} strokeWidth={1.5} />
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex min-w-[4.25rem] items-center justify-center gap-1.5 px-3 font-mono text-xs text-on-surface tabular-nums"
                  data-testid="study-session-timer"
                  aria-label={`Session time: ${formatStudyTimer(session.timerSeconds)}`}
                >
                  <Timer
                    size={14}
                    strokeWidth={1.5}
                    className="text-on-surface-variant"
                  />
                  {formatStudyTimer(session.timerSeconds)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Elapsed study time — {formatStudyTimer(session.timerSeconds)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div
        className="w-full h-1.5 bg-surface-container border border-outline rounded-full mb-4 relative overflow-hidden"
        data-testid="study-session-progress-bar"
      >
        <div
          className="absolute top-0 left-0 h-full bg-on-surface transition-all duration-300"
          style={{
            width: `${(session.currentCardIndex / session.cardFronts.length) * 100}%`,
          }}
        />
      </div>

      <div
        ref={viewportRef}
        className="flex-1 min-h-0 flex flex-col gap-2 relative"
      >
        <Card className="relative flex-1 min-h-0 flex flex-col gap-0 overflow-visible py-0">
          {session.ratingAnimation && (
            <StudyRatingFlyout
              rating={session.ratingAnimation.rating}
              animationKey={session.ratingAnimation.key}
            />
          )}
          <ScalableContent
            ref={contentRef}
            scale={scale}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div
              className={`min-h-0 transition-all duration-300 ${
                session.isFlipped
                  ? 'shrink-0 overflow-hidden border-b border-outline-variant'
                  : 'flex-1'
              }`}
            >
              {session.isFlipped && <StudyCardSectionHeader label="Question" />}
              {session.currentFront && (
                <CardFrontDisplay
                  key={session.currentFront.id}
                  card={session.currentFront}
                  compact={session.isFlipped}
                />
              )}
            </div>

            {session.isFlipped && session.currentBack && (
              <MotionFade
                type="fadeUp"
                className="flex min-h-0 flex-1 flex-col"
              >
                <StudyCardSectionHeader
                  label="Answer"
                  className="border-t border-outline-variant"
                />
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <CardBackDisplay
                    key={session.currentBack.id}
                    card={session.currentBack}
                    autoPlayAudio={!session.isEditOpen}
                  />
                </div>
              </MotionFade>
            )}
          </ScalableContent>
        </Card>

        <div className="shrink-0 space-y-2">
          {session.isFlipped && session.preview && (
            <StudyRetrievabilityBar
              retrievability={session.preview.currentRetrievability}
            />
          )}

          {!session.isFlipped ? (
            <div className="flex items-center gap-2">
              <StudyAutoFlipControls
                enabled={session.preferences.autoFlipEnabled}
                seconds={session.preferences.autoFlipSeconds}
                remainingSeconds={session.autoFlipRemainingSeconds}
                onToggle={session.toggleAutoFlip}
                className="shrink-0"
              />
              <Button
                data-testid="study-session-show-answer-button"
                aria-keyshortcuts="Space"
                className="relative flex w-full items-center justify-center gap-2 py-2.5 text-sm uppercase tracking-wider"
                onClick={() => void session.flip()}
                disabled={session.isLoadingBack}
              >
                {session.isLoadingBack ? 'Loading...' : 'Show Answer'}
                <span className="absolute right-3 hidden font-mono text-[10px] normal-case tracking-normal opacity-70 sm:inline">
                  Space
                </span>
              </Button>
            </div>
          ) : (
            <ReviewRatingBar
              preview={session.preview}
              onReview={(rating) => void session.rate(rating)}
              disabled={session.isSubmitting}
            />
          )}
        </div>
      </div>

      <EditCardModal
        isOpen={session.isEditOpen}
        onClose={session.closeEdit}
        card={session.editingCard}
        onSave={session.saveEdit}
        onDraftChange={session.updateEditDraft}
        loading={session.isUpdatingCard}
      />
    </AnimatedPage>
  )
}
