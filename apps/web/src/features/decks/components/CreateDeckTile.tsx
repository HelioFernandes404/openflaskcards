import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'

interface CreateDeckTileProps {
  onClick: () => void
  label?: string
  hint?: string
}

export function CreateDeckTile({
  onClick,
  label = 'Create New Deck',
  hint = 'Start a new study collection',
}: CreateDeckTileProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      data-testid="dashboard-create-deck-button"
      className="flex flex-col justify-between group h-full relative overflow-hidden cursor-pointer transition-all duration-200 hover:border-outline-strong bg-surface-container-low border-outline-variant focus-visible:outline-2 focus-visible:outline-on-surface focus-visible:outline-offset-3"
    >
      <div className="h-px w-full shrink-0 bg-outline-variant" />

      <CardContent className="p-4 flex flex-col h-full justify-between">
        <div className="flex flex-col items-center text-center pt-4 pb-6 flex-1 justify-center">
          <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline flex items-center justify-center mb-3 group-hover:border-outline-strong transition-colors duration-200">
            <Plus
              size={20}
              strokeWidth={1.5}
              className="text-on-surface-variant group-hover:text-on-surface transition-colors duration-200"
            />
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight text-on-surface-variant group-hover:text-on-surface transition-colors duration-200">
            {label}
          </h3>
          <p className="font-mono text-2xs uppercase tracking-wider text-muted mt-2">
            {hint}
          </p>
        </div>

        <div className="flex gap-2 pointer-events-none" aria-hidden="true">
          <div className="flex-1 py-2 text-sm border border-outline rounded-md flex items-center justify-center text-on-surface-variant">
            <Plus size={16} strokeWidth={1.5} />
          </div>
          <div className="flex-[3] py-2 text-sm uppercase tracking-wide border border-outline-variant rounded-md flex items-center justify-center text-on-surface-variant group-hover:border-outline-strong group-hover:text-on-surface transition-colors duration-200">
            Create
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
