import { Card } from '@/shared/components/card'
import {
  PRESETS,
  type Preset,
} from '@/features/algorithm-settings/constants/fsrsPresets'
import { cn } from '@/shared/utils'

interface PresetSelectorProps {
  activeRetention: number
  onSelect: (preset: Preset) => void
}

const PRESET_META: Record<
  string,
  { name: string; description: string; reviews: string }
> = {
  relaxed: {
    name: 'Relaxed',
    description: 'Fewer reviews per day',
    reviews: '~30% less reviews',
  },
  balanced: {
    name: 'Balanced',
    description: 'Recommended for most people',
    reviews: 'Standard workload',
  },
  intensive: {
    name: 'Intensive',
    description: 'Maximum retention',
    reviews: '~50% more reviews',
  },
}

export function PresetSelector({
  activeRetention,
  onSelect,
}: PresetSelectorProps) {
  const presetEntries = Object.entries(PRESETS)

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-on-surface">Quick presets</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Pick a study intensity. You can still fine-tune retention with the
          slider above.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {presetEntries.map(([key, preset]) => {
          const meta = PRESET_META[key] ?? {
            name: key,
            description: '',
            reviews: '',
          }
          const isActive = Math.abs(activeRetention - preset.retention) < 0.005

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(preset)}
              className={cn(
                'p-4 border rounded-lg transition-colors text-left',
                isActive
                  ? 'border-outline-strong bg-surface-container-high'
                  : 'border-outline bg-surface-container-low hover:border-outline-strong',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn('w-3 h-3 rounded-full shrink-0', preset.color)}
                />
                <p className="font-semibold text-sm text-on-surface">
                  {meta.name}
                </p>
              </div>
              <p className="text-xs text-on-surface-variant">
                {meta.description}
              </p>
              <p className="text-xs font-mono text-on-surface-variant mt-2">
                {(preset.retention * 100).toFixed(0)}% retention ·{' '}
                {meta.reviews}
              </p>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
