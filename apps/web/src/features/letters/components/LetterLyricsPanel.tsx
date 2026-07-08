import { cn } from '@/shared/utils'
import type { LyricsLine } from '../domain/alignLyricsLines'
import type { LetterViewColumns } from '../domain/letterViewMode'
import { LetterLyricsRow } from './LetterLyricsRow'

interface LetterLyricsPanelProps {
  lines: LyricsLine[]
  columns: LetterViewColumns
  revealedLineIds: ReadonlySet<string>
  onToggleReveal: (lineId: string) => void
}

export function LetterLyricsPanel({
  lines,
  columns,
  revealedLineIds,
  onToggleReveal,
}: LetterLyricsPanelProps) {
  const twoColumn =
    columns.showEnglish && (columns.showPortuguese || columns.revealPortuguese)

  return (
    <div
      className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
      data-testid="letter-lyrics-panel"
    >
      <div
        className={cn(
          'sticky top-0 z-10 hidden border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur-sm md:grid',
          twoColumn ? 'md:grid-cols-2' : 'md:grid-cols-1',
        )}
      >
        {columns.showEnglish && (
          <p className="px-6 py-3 font-mono text-2xs uppercase tracking-widest text-on-surface-variant">
            Original
          </p>
        )}
        {columns.showPortuguese && (
          <p className="px-6 py-3 font-mono text-2xs uppercase tracking-widest text-on-surface-variant">
            Translation
          </p>
        )}
        {columns.revealPortuguese && (
          <p className="px-6 py-3 font-mono text-2xs uppercase tracking-widest text-on-surface-variant">
            Translation
          </p>
        )}
      </div>

      {lines.map((line, index) => (
        <LetterLyricsRow
          key={line.id}
          index={index}
          english={line.english}
          portuguese={line.portuguese}
          columns={columns}
          isRevealed={revealedLineIds.has(line.id)}
          onToggleReveal={() => onToggleReveal(line.id)}
        />
      ))}
    </div>
  )
}
