import { Volume2 } from 'lucide-react'

export function SelectionSpeechStatus({
  isPlaying,
  isSynthesizing,
}: {
  isPlaying: boolean
  isSynthesizing: boolean
}) {
  if (!isPlaying && !isSynthesizing) return null

  const label = isSynthesizing
    ? 'Generating audio…'
    : 'Playing selection — Alt+S to stop'

  return (
    <div
      className="fixed bottom-24 md:bottom-8 left-4 z-[190] flex items-center gap-2 rounded-full border border-outline bg-surface-container px-3 py-2 text-xs font-medium text-on-surface shadow-lg"
      role="status"
      aria-live="polite"
    >
      <Volume2 size={14} className="shrink-0 text-primary" aria-hidden />
      <span>{label}</span>
      <kbd className="ml-1 hidden sm:inline rounded border border-outline bg-surface-container-low px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
        Alt+S
      </kbd>
    </div>
  )
}
