import { memo } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Badge } from '@/shared/components/badge'
import { Switch } from '@/shared/components/switch'
import { cn } from '@/shared/utils'
import type { Card } from '../../types/card'

interface CardTableRowProps {
  card: Card
  isSelected: boolean
  rowIndex: number
  gridTemplateColumns: string
  deckName: string
  stateLabel: string
  onSelectCard: (id: string) => void
  onTtsEnabledChange: (cardId: string, enabled: boolean) => void
}

function TtsStatusBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <Badge variant="neutral" className="uppercase">
        <Volume2 strokeWidth={1.5} />
        On
      </Badge>
    )
  }

  return (
    <Badge variant="outlined" className="uppercase text-on-surface-variant">
      <VolumeX strokeWidth={1.5} />
      Off
    </Badge>
  )
}

function CardStateBadge({
  state,
  label,
}: {
  state: Card['state']
  label: string
}) {
  const variant =
    state === 'new' ? 'outlined' : state === 'review' ? 'default' : 'neutral'

  return (
    <Badge variant={variant} className="uppercase">
      {label}
    </Badge>
  )
}

export const CardTableRow = memo(function CardTableRow({
  card,
  isSelected,
  rowIndex,
  gridTemplateColumns,
  deckName,
  stateLabel,
  onSelectCard,
  onTtsEnabledChange,
}: CardTableRowProps) {
  return (
    <button
      type="button"
      role="row"
      data-virtual-row="true"
      data-testid={`browse-card-row-${card.id}`}
      aria-selected={isSelected}
      aria-rowindex={rowIndex + 1}
      aria-label={`${card.front}, ${stateLabel}, ${deckName}`}
      onClick={() => onSelectCard(card.id)}
      className={cn(
        'grid h-11 min-h-11 w-full border-b border-outline text-left text-sm transition-colors duration-150 cursor-pointer',
        isSelected
          ? 'border-l-2 border-l-on-surface bg-surface-container-low font-medium'
          : 'border-l-2 border-l-transparent hover:bg-surface-container/50',
      )}
      style={{ gridTemplateColumns }}
    >
      <div
        className="truncate border-r border-outline px-3 py-2.5"
        data-column="front"
        data-column-role="cell"
      >
        <span className="block truncate">{card.front}</span>
      </div>
      <div
        className="flex items-center gap-2 border-r border-outline px-3 py-2"
        data-column="tts"
        data-column-role="cell"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Switch
          checked={card.ttsEnabled}
          onCheckedChange={(checked) => onTtsEnabledChange(card.id, checked)}
          aria-label={`${card.ttsEnabled ? 'Disable' : 'Enable'} TTS for ${card.front}`}
          data-testid={`browse-card-tts-${card.id}`}
        />
        <TtsStatusBadge enabled={card.ttsEnabled} />
      </div>
      <div
        className="flex items-center border-r border-outline px-3 py-2"
        data-column="state"
        data-column-role="cell"
      >
        <CardStateBadge state={card.state} label={stateLabel} />
      </div>
      <div
        className="truncate px-3 py-2.5 text-on-surface-variant"
        data-column="deck"
        data-column-role="cell"
      >
        {deckName}
      </div>
    </button>
  )
})
