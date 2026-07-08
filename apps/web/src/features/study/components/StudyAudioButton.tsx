import { Volume2 } from 'lucide-react'
import { cn } from '@/shared/utils'

interface StudyAudioButtonProps {
  isPlaying: boolean
  onClick: () => void
  className?: string
}

export function StudyAudioButton({
  isPlaying,
  onClick,
  className,
}: StudyAudioButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPlaying ? 'Playing pronunciation' : 'Play pronunciation'}
      aria-pressed={isPlaying}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2',
        'border-outline bg-surface-container text-on-surface-variant',
        'transition-all duration-150 hover:border-outline-strong hover:bg-surface-container-high hover:text-on-surface',
        'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-3',
        isPlaying && 'border-outline-strong text-on-surface',
        className,
      )}
    >
      <Volume2
        size={16}
        strokeWidth={1.5}
        className={cn(isPlaying && 'animate-pulse')}
      />
      <span className="font-mono text-2xs uppercase tracking-wider">
        {isPlaying ? 'Playing' : 'Listen'}
      </span>
    </button>
  )
}
