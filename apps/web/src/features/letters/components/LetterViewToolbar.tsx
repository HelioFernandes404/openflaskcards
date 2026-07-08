import { Check } from 'lucide-react'
import { cn } from '@/shared/utils'
import {
  LETTER_VIEW_MODES,
  type LetterViewMode,
} from '../domain/letterViewMode'

interface LetterViewToolbarProps {
  mode: LetterViewMode
  onModeChange: (mode: LetterViewMode) => void
  revealMode: boolean
  onRevealAll?: () => void
  onHideAll?: () => void
  canRevealAll?: boolean
}

export function LetterViewToolbar({
  mode,
  onModeChange,
  revealMode,
  onRevealAll,
  onHideAll,
  canRevealAll = false,
}: LetterViewToolbarProps) {
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="letter-view-toolbar"
    >
      <div
        className="flex flex-wrap gap-2"
        role="listbox"
        aria-label="Reading mode"
      >
        {LETTER_VIEW_MODES.map((option) => {
          const selected = option.id === mode
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={selected}
              title={option.description}
              data-testid={`letter-view-mode-${option.id}`}
              onClick={() => onModeChange(option.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                'focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-2',
                selected
                  ? 'bg-primary text-on-primary shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-primary)]'
                  : 'border border-outline bg-surface-container-low text-on-surface-variant hover:border-outline-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {selected && <Check size={14} strokeWidth={2.5} aria-hidden />}
              {option.label}
            </button>
          )
        })}
      </div>

      {revealMode && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="letter-reveal-all"
            disabled={!canRevealAll}
            onClick={onRevealAll}
            className={cn(
              'rounded-full border border-outline px-3 py-1.5 text-xs font-medium transition-colors',
              'text-on-surface-variant hover:border-outline-variant hover:text-on-surface',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-2',
            )}
          >
            Reveal all
          </button>
          <button
            type="button"
            data-testid="letter-hide-all"
            onClick={onHideAll}
            className={cn(
              'rounded-full border border-outline px-3 py-1.5 text-xs font-medium transition-colors',
              'text-on-surface-variant hover:border-outline-variant hover:text-on-surface',
              'focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-2',
            )}
          >
            Hide all
          </button>
        </div>
      )}
    </div>
  )
}
