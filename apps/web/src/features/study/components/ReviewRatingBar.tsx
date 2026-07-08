import type { ReviewPreviewResponse } from '@/features/study/types/preview'
import {
  formatReviewDueDate,
  formatReviewDueDisplay,
} from '@/features/study/utils/formatReviewDue'
import { cn } from '@/shared/utils'

const REVIEW_RATINGS = [
  {
    rating: 1 as const,
    label: 'Again',
    shortcut: 'Q',
    arrowShortcut: '',
    keyCode: 'KeyQ',
    testid: 'study-session-review-again-button',
    labelColor: 'text-danger-800',
    accent:
      'hover:bg-danger-50 hover:border-danger-200 focus-visible:border-danger-200',
  },
  {
    rating: 2 as const,
    label: 'Hard',
    shortcut: 'W',
    arrowShortcut: '',
    keyCode: 'KeyW',
    testid: 'study-session-review-hard-button',
    labelColor: 'text-on-surface-variant',
    accent: 'hover:bg-surface-container hover:border-outline-strong',
  },
  {
    rating: 3 as const,
    label: 'Good',
    shortcut: 'E',
    arrowShortcut: '',
    keyCode: 'KeyE',
    testid: 'study-session-review-good-button',
    labelColor: 'text-on-surface',
    accent: 'hover:bg-surface-container hover:border-outline-strong',
  },
  {
    rating: 4 as const,
    label: 'Easy',
    shortcut: 'R',
    arrowShortcut: '',
    keyCode: 'KeyR',
    testid: 'study-session-review-easy-button',
    labelColor: 'text-success-600',
    accent:
      'hover:bg-success-50 hover:border-success-200 focus-visible:border-success-200',
  },
]

interface ReviewRatingBarProps {
  preview: ReviewPreviewResponse | null
  onReview: (rating: 1 | 2 | 3 | 4) => void
  disabled?: boolean
}

function getPreviewOption(
  preview: ReviewPreviewResponse | null,
  rating: 1 | 2 | 3 | 4,
) {
  return preview?.options.find((option) => option.rating === rating) ?? null
}

function formatTooltip(
  option: ReviewPreviewResponse['options'][number] | null,
): string {
  if (!option) return 'Next review unavailable'

  const dueDate = formatReviewDueDate(option.due)
  const interval = option.intervalString.toLowerCase()
  return `Next review on ${dueDate} (${interval} from now)`
}

export function ReviewRatingBar({
  preview,
  onReview,
  disabled = false,
}: ReviewRatingBarProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {REVIEW_RATINGS.map(
        ({
          rating,
          label,
          shortcut,
          arrowShortcut,
          keyCode,
          testid,
          labelColor,
          accent,
        }) => {
          const option = getPreviewOption(preview, rating)
          const dueDisplay = option ? formatReviewDueDisplay(option.due) : null

          return (
            <button
              key={rating}
              type="button"
              data-testid={testid}
              onClick={() => onReview(rating)}
              disabled={disabled}
              title={formatTooltip(option)}
              aria-keyshortcuts={`${shortcut} ${keyCode}`}
              className={cn(
                'group relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 sm:min-h-[3.75rem] sm:px-2',
                'border-outline bg-surface-container-low transition-all duration-150',
                'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                accent,
              )}
            >
              <span
                className={cn('text-sm font-semibold leading-none', labelColor)}
              >
                {label}
              </span>
              {dueDisplay ? (
                <span className="flex max-w-full flex-col items-center gap-0.5 px-0.5 text-center leading-tight text-on-surface-variant">
                  <span className="text-[10px] sm:text-2xs">
                    {dueDisplay.dateLabel}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums sm:text-2xs">
                    {dueDisplay.timeLabel}
                  </span>
                </span>
              ) : (
                <span className="text-[10px] text-muted sm:text-2xs">—</span>
              )}
              <span className="absolute right-1 top-1 hidden items-center gap-1 font-mono text-[9px] text-muted sm:flex">
                <span>{arrowShortcut}</span>
                <span className="text-muted/60">{shortcut}</span>
              </span>
            </button>
          )
        },
      )}
    </div>
  )
}
