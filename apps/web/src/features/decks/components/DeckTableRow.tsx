import { useCallback } from 'react'
import {
  MoreVertical,
  Plus,
  Zap,
  Edit,
  Trash2,
  Copy,
  Pin,
  PinOff,
} from 'lucide-react'
import { Button } from '@/shared/components/button'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { formatDeckCliSnippet } from '@/features/decks/utils/deckCliSnippet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu'
import {
  getDeckDueToday,
  getDeckTodayCounts,
} from '@/features/decks/utils/deckCounts'
import { DeckModuleSelect } from '@/features/modules/components/DeckModuleSelect'
import type { Module } from '@/features/modules/types/module'
import { cn } from '@/shared/utils'

interface DeckTableRowProps {
  id: string
  name: string
  moduleId?: string | null
  modules?: Module[]
  moduleAssignLoading?: boolean
  onAssignModule?: (deckId: string, moduleId: string | null) => void
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
  isPinned?: boolean
  onTogglePin?: (id: string) => void
}

function CountCell({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-mono text-sm tabular-nums',
        value > 0 ? 'text-on-surface' : 'text-muted',
        className,
      )}
    >
      {value}
    </span>
  )
}

export function DeckTableRow({
  id,
  name,
  moduleId = null,
  modules = [],
  moduleAssignLoading = false,
  onAssignModule,
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
  isPinned = false,
  onTogglePin,
}: DeckTableRowProps) {
  const { showToast } = useNotification()

  const handleCopyCliCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatDeckCliSnippet(id))
      showToast('CLI command copied', 'success')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }, [id, showToast])

  const counts = getDeckTodayCounts({
    newCount,
    learnCount,
    reviewCount,
    newCardsStudiedToday,
    newCardsDailyLimit,
  })
  const { availableNewToday } = counts
  const dueToday = getDeckDueToday({
    newCount,
    learnCount,
    reviewCount,
    newCardsStudiedToday,
    newCardsDailyLimit,
  })

  return (
    <tr
      className="group border-b border-outline-variant last:border-b-0 transition-colors hover:bg-surface-container"
      data-testid={`deck-item-${id}`}
    >
      <td className="px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <span
            className="truncate text-sm font-medium text-on-surface"
            title={name}
          >
            {name}
          </span>
          {isPinned ? (
            <Pin
              size={12}
              className="shrink-0 text-on-surface-variant"
              aria-label="Pinned"
            />
          ) : null}
        </div>
      </td>

      {onAssignModule && modules.length > 0 ? (
        <td className="hidden sm:table-cell px-4 py-3.5 min-w-[160px]">
          <DeckModuleSelect
            id={`deck-module-${id}`}
            modules={modules}
            value={moduleId}
            compact
            disabled={moduleAssignLoading}
            onChange={(nextModuleId) => {
              if (nextModuleId !== moduleId) {
                onAssignModule(id, nextModuleId)
              }
            }}
          />
        </td>
      ) : null}

      <td className="hidden md:table-cell px-4 py-3.5 text-right">
        <CountCell value={newCount} />
        <span className="block font-mono text-2xs text-on-surface-variant mt-0.5 opacity-70 tabular-nums">
          {`${availableNewToday}/${newCardsDailyLimit} today`}
        </span>
      </td>
      <td className="hidden md:table-cell px-4 py-3.5 text-right">
        <CountCell value={learnCount} />
      </td>
      <td className="hidden md:table-cell px-4 py-3.5 text-right">
        <CountCell value={reviewCount} />
      </td>

      <td className="px-4 py-3.5 text-right">
        <CountCell
          value={dueToday}
          className={dueToday > 0 ? 'text-on-surface font-medium' : undefined}
        />
      </td>

      <td className="hidden lg:table-cell px-4 py-3.5">
        <span className="font-mono text-2xs text-on-surface-variant whitespace-nowrap">
          {lastReviewed}
        </span>
      </td>

      <td className="px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            data-testid={`deck-item-add-cards-button-${id}`}
            className="h-9 w-9 shrink-0 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onAddCards(id)
            }}
            title="Add cards"
            aria-label="Add cards"
          >
            <Plus size={16} strokeWidth={1.5} />
          </Button>

          <Button
            size="sm"
            data-testid={`deck-item-study-button-${id}`}
            className="shrink-0 gap-1.5"
            onClick={() => onStart(id)}
          >
            Study
            <Zap size={14} strokeWidth={1.5} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`deck-item-menu-button-${id}`}
                aria-label="Deck actions"
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  'text-on-surface-variant transition-colors',
                  'hover:bg-surface-container-high hover:text-on-surface',
                  'focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-2',
                  'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={16} strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                data-testid={`deck-item-copy-cli-button-${id}`}
                onClick={() => void handleCopyCliCommand()}
              >
                <Copy size={14} strokeWidth={1.5} />
                Copy CLI command
              </DropdownMenuItem>
              {onTogglePin && (
                <DropdownMenuItem
                  data-testid={`deck-item-pin-button-${id}`}
                  onClick={() => onTogglePin(id)}
                >
                  {isPinned ? (
                    <PinOff size={14} strokeWidth={1.5} />
                  ) : (
                    <Pin size={14} strokeWidth={1.5} />
                  )}
                  {isPinned ? 'Unpin' : 'Pin to top'}
                </DropdownMenuItem>
              )}
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
        </div>
      </td>
    </tr>
  )
}
