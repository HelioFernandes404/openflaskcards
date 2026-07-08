import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/shared/utils'
import type { LetterViewColumns } from '../domain/letterViewMode'

interface LetterLyricsRowProps {
  english: string
  portuguese: string
  index: number
  columns: LetterViewColumns
  isRevealed: boolean
  onToggleReveal: () => void
}

export function LetterLyricsRow({
  english,
  portuguese,
  index,
  columns,
  isRevealed,
  onToggleReveal,
}: LetterLyricsRowProps) {
  const isBlank = !english.trim() && !portuguese.trim()
  const twoColumn =
    columns.showEnglish && (columns.showPortuguese || columns.revealPortuguese)
  const hasTranslation = Boolean(portuguese.trim())
  const showRevealControl = columns.revealPortuguese && hasTranslation

  return (
    <div
      className={cn(
        'grid grid-cols-1 border-b border-outline-variant last:border-b-0',
        twoColumn ? 'md:grid-cols-2 md:gap-0' : 'md:grid-cols-1',
        !isBlank && 'transition-colors hover:bg-surface-container-high/60',
        isBlank && 'bg-surface-container-lowest/40',
      )}
      data-testid={`letter-line-${index}`}
    >
      {columns.showEnglish && (
        <div
          className={cn(
            'px-4 py-4 md:px-6 md:py-5',
            twoColumn && 'md:border-r md:border-outline-variant',
            isBlank && 'py-2 md:py-3',
          )}
        >
          <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-on-surface-variant md:hidden">
            Original
          </p>
          <p
            className={cn(
              'font-display text-base leading-relaxed whitespace-pre-wrap sm:text-lg',
              isBlank ? 'min-h-[0.75rem]' : 'text-on-surface',
            )}
          >
            {english}
          </p>
        </div>
      )}

      {columns.showPortuguese && (
        <div
          className={cn(
            'px-4 pb-4 md:px-6 md:py-5',
            columns.showEnglish && 'md:py-5',
            isBlank && 'py-2 md:py-3',
          )}
        >
          <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-on-surface-variant md:hidden">
            Translation
          </p>
          <p
            className={cn(
              'font-display text-base leading-relaxed whitespace-pre-wrap sm:text-lg',
              isBlank ? 'min-h-[0.75rem]' : 'text-on-surface-variant',
            )}
          >
            {portuguese}
          </p>
        </div>
      )}

      {columns.revealPortuguese && (
        <div className="px-4 pb-4 md:px-6 md:py-5">
          <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-on-surface-variant md:hidden">
            Translation
          </p>
          {showRevealControl ? (
            isRevealed ? (
              <button
                type="button"
                onClick={onToggleReveal}
                className="group w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-left transition-colors hover:border-outline hover:bg-surface-container"
                data-testid={`letter-line-reveal-${index}`}
                aria-expanded
              >
                <span className="mb-2 inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest text-on-surface-variant">
                  <EyeOff size={12} aria-hidden />
                  Hide translation
                </span>
                <p className="font-display text-base leading-relaxed whitespace-pre-wrap text-on-surface-variant sm:text-lg">
                  {portuguese}
                </p>
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleReveal}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant transition-colors hover:border-outline hover:text-on-surface"
                data-testid={`letter-line-reveal-${index}`}
                aria-expanded={false}
              >
                <Eye size={15} strokeWidth={1.5} aria-hidden />
                Tap to reveal
              </button>
            )
          ) : (
            <div
              className={cn(isBlank ? 'min-h-[0.75rem]' : 'min-h-[2.75rem]')}
            />
          )}
        </div>
      )}
    </div>
  )
}
