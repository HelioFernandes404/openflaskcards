import { Plus, Clock, MoreVertical, Zap, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import { Button } from '@/shared/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu'
import { getDeckTodayCounts } from '@/features/decks/utils/deckCounts'

/**
 * Card status columns (Anki-style deck browser):
 * - New: total unseen cards (state = 'new'); subtext shows quota available today.
 * - Lrn: learning/relearning cards due now (due ≤ now).
 * - Rev: review cards due now (due ≤ now).
 */

interface DeckItemProps {
  id: string
  name: string
  newCount?: number
  learnCount?: number
  reviewCount?: number
  newCardsStudiedToday?: number
  newCardsDailyLimit?: number
  lastReviewed?: string
  accentColor?: string
  onStart: (id: string) => void
  onAddCards: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function DeckItem({
  id,
  name,
  newCount = 0,
  learnCount = 0,
  reviewCount = 0,
  newCardsStudiedToday = 0,
  newCardsDailyLimit = 10,
  lastReviewed = 'Never',
  accentColor = 'var(--color-outline-strong)',
  onStart,
  onAddCards,
  onEdit,
  onDelete,
}: DeckItemProps) {
  const { availableNewToday } = getDeckTodayCounts({
    newCount,
    learnCount,
    reviewCount,
    newCardsStudiedToday,
    newCardsDailyLimit,
  })

  return (
    <Card
      className="flex flex-col justify-between group h-full relative overflow-hidden transition-all hover:border-outline-strong"
      data-testid={`deck-item-${id}`}
    >
      {/* Accent bar */}
      <div
        className="h-px w-full shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      <CardContent className="p-4 flex flex-col h-full justify-between">
        {/* Header: name + last reviewed + menu */}
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 mr-2">
            <h3
              className="text-base font-semibold tracking-tight mb-1 line-clamp-1 text-on-surface"
              title={name}
            >
              {name}
            </h3>
            <p className="font-mono text-2xs text-on-surface-variant flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {`Reviewed ${lastReviewed}`}
            </p>
          </div>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`deck-item-menu-button-${id}`}
                  aria-label="Edit"
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 hover:bg-surface-container-high rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-on-surface shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical
                    size={16}
                    className="text-on-surface-variant"
                    strokeWidth={1.5}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <DropdownMenuItem
                    data-testid={`deck-item-edit-button-${id}`}
                    onClick={() => onEdit(id)}
                  >
                    <Edit size={14} strokeWidth={1.5} />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    data-testid={`deck-item-delete-button-${id}`}
                    className="text-error focus:text-error"
                    onClick={() => onDelete(id)}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Stats chips + actions */}
        <div className="space-y-3">
          {/* New / Lrn / Rev chips — semantic oklch fills */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* New — info blue */}
            <div className="p-2 bg-info-50 border border-info-200 rounded-md">
              <span className="block text-base font-semibold text-info-600">
                {newCount}
              </span>
              <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
                New
              </span>
              <span className="block font-mono text-2xs text-on-surface-variant mt-0.5 opacity-70">
                {`${availableNewToday}/${newCardsDailyLimit} today`}
              </span>
            </div>

            {/* Lrn — warning amber */}
            <div className="p-2 bg-warning-50 border border-warning-200 rounded-md">
              <span className="block text-base font-semibold text-warning-600">
                {learnCount}
              </span>
              <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
                Lrn
              </span>
            </div>

            {/* Rev — success green */}
            <div className="p-2 bg-success-50 border border-success-200 rounded-md">
              <span className="block text-base font-semibold text-success-600">
                {reviewCount}
              </span>
              <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
                Rev
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="neutral"
              size="sm"
              data-testid={`deck-item-add-cards-button-${id}`}
              className="flex-1 py-2 text-sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddCards(id)
              }}
              title="Add Cards"
            >
              <Plus size={16} strokeWidth={1.5} />
            </Button>
            <Button
              size="sm"
              data-testid={`deck-item-study-button-${id}`}
              className="flex-[3] py-2 text-sm uppercase tracking-wide gap-2"
              onClick={() => onStart(id)}
            >
              Study <Zap size={14} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
