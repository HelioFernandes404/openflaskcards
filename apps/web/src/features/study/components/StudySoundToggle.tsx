import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/shared/components/button'

interface StudySoundToggleProps {
  enabled: boolean
  onToggle: () => void
}

export function StudySoundToggle({ enabled, onToggle }: StudySoundToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-testid="study-session-sound-toggle"
      className="size-10 shrink-0 rounded-none border-0 shadow-none hover:bg-surface-container"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute study sounds' : 'Enable study sounds'}
    >
      {enabled ? (
        <Volume2 size={16} strokeWidth={1.5} />
      ) : (
        <VolumeX size={16} strokeWidth={1.5} />
      )}
    </Button>
  )
}
