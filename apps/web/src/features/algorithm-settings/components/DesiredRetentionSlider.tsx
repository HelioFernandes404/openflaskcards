import { useMemo } from 'react'
import { Card } from '@/shared/components/card'

interface DesiredRetentionSliderProps {
  value: number
  onChange: (value: number) => void
}

export function DesiredRetentionSlider({
  value,
  onChange,
}: DesiredRetentionSliderProps) {
  const safeValue = value != null && !isNaN(value) ? value : 0.9

  const impact = useMemo(() => {
    if (safeValue >= 0.95) {
      return {
        workload: 'Very high daily reviews',
        hint: 'You will review cards often, but forget very little.',
      }
    }
    if (safeValue >= 0.92) {
      return {
        workload: 'High daily reviews',
        hint: 'Strong memory retention with noticeably more reviews per day.',
      }
    }
    if (safeValue >= 0.88) {
      return {
        workload: 'Moderate daily reviews',
        hint: 'A good balance for most learners.',
      }
    }
    if (safeValue >= 0.85) {
      return {
        workload: 'Balanced workload',
        hint: 'Fewer reviews; you may forget a bit more between sessions.',
      }
    }
    if (safeValue >= 0.8) {
      return {
        workload: 'Light daily reviews',
        hint: 'Less time studying, but more cards will feel forgotten.',
      }
    }
    return {
      workload: 'Minimal daily reviews',
      hint: 'Lowest study load; expect more lapses over time.',
    }
  }, [safeValue])

  return (
    <Card className="p-6">
      <div className="mb-1">
        <label className="font-semibold text-lg text-on-surface">
          Target retention
        </label>
        <p className="text-sm text-on-surface-variant mt-1">
          The percentage of cards you want to remember when they come due for
          review. Higher = more reviews, lower forgetting.
        </p>
      </div>

      <div className="flex justify-between items-baseline mt-4 mb-2">
        <span className="text-sm text-on-surface-variant">
          How much to remember
        </span>
        <span className="text-3xl font-bold text-on-surface tabular-nums">
          {(safeValue * 100).toFixed(0)}%
        </span>
      </div>

      <input
        type="range"
        min={0.7}
        max={0.97}
        step={0.01}
        value={safeValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label="Target retention percentage"
        className="w-full h-1 border border-outline rounded-lg cursor-pointer bg-surface-container accent-on-surface"
      />

      <div className="flex justify-between text-xs text-on-surface-variant mt-1 font-mono">
        <span>70%</span>
        <span>90%</span>
        <span>97%</span>
      </div>

      <div className="mt-4 rounded-lg bg-surface-container-low px-4 py-3">
        <p className="text-sm font-medium text-on-surface">{impact.workload}</p>
        <p className="text-xs text-on-surface-variant mt-1">{impact.hint}</p>
      </div>
    </Card>
  )
}
