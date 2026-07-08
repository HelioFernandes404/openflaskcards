import { useRef } from 'react'
import { Textarea } from '@/shared/components/textarea'
import { cn } from '@/shared/utils'

interface LetterLyricsEditorProps {
  originalLyrics: string
  translation: string
  onOriginalChange: (value: string) => void
  onTranslationChange: (value: string) => void
}

export function LetterLyricsEditor({
  originalLyrics,
  translation,
  onOriginalChange,
  onTranslationChange,
}: LetterLyricsEditorProps) {
  const originalRef = useRef<HTMLTextAreaElement>(null)
  const translationRef = useRef<HTMLTextAreaElement>(null)
  const syncingScroll = useRef(false)

  const syncScroll = (
    source: HTMLTextAreaElement,
    target: HTMLTextAreaElement,
  ) => {
    if (syncingScroll.current) return
    syncingScroll.current = true
    target.scrollTop = source.scrollTop
    requestAnimationFrame(() => {
      syncingScroll.current = false
    })
  }

  const textareaClassName = cn(
    'min-h-[320px] w-full resize-y rounded-lg border border-outline bg-surface-container-low px-3 py-2.5',
    'font-mono text-sm leading-relaxed text-on-surface outline-none',
    'focus-visible:border-primary/40 focus-visible:outline-2 focus-visible:outline-[rgba(236,237,241,0.15)] focus-visible:outline-offset-[2px]',
  )

  return (
    <div
      className="overflow-hidden rounded-xl border border-outline-variant"
      data-testid="letter-lyrics-editor"
    >
      <div className="grid grid-cols-1 border-b border-outline-variant bg-surface-container-lowest md:grid-cols-2">
        <label
          htmlFor="letter-original"
          className="border-b border-outline-variant px-4 py-3 font-mono text-2xs uppercase tracking-widest text-on-surface-variant md:border-b-0 md:border-r md:px-6"
        >
          Original
        </label>
        <label
          htmlFor="letter-translation"
          className="px-4 py-3 font-mono text-2xs uppercase tracking-widest text-on-surface-variant md:px-6"
        >
          Translation
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-outline-variant p-3 md:border-b-0 md:border-r md:p-4">
          <Textarea
            ref={originalRef}
            id="letter-original"
            data-testid="letter-original-input"
            value={originalLyrics}
            onChange={(e) => onOriginalChange(e.target.value)}
            onScroll={(e) => {
              if (translationRef.current) {
                syncScroll(e.currentTarget, translationRef.current)
              }
            }}
            placeholder="Paste the full lyrics in English, one line per row..."
            className={textareaClassName}
            spellCheck={false}
          />
        </div>

        <div className="p-3 md:p-4">
          <Textarea
            ref={translationRef}
            id="letter-translation"
            data-testid="letter-translation-input"
            value={translation}
            onChange={(e) => onTranslationChange(e.target.value)}
            onScroll={(e) => {
              if (originalRef.current) {
                syncScroll(e.currentTarget, originalRef.current)
              }
            }}
            placeholder="Paste the Portuguese translation, matching line breaks..."
            className={textareaClassName}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
