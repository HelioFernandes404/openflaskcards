import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/shared/components/card'
import { Input } from '@/shared/components/input'
import {
  FSRS_PARAMETER_GROUPS,
  FSRS_PARAMETERS,
  type FSRSParameterInfo,
} from '@/features/algorithm-settings/constants/fsrsParameterInfo'
import { cn } from '@/shared/utils'

interface ParameterSectionProps {
  groupKey: keyof typeof FSRS_PARAMETER_GROUPS
  parameters: number[]
  startIndex: number
  onChange: (index: number, value: number) => void
}

function ParameterField({
  info,
  value,
  onChange,
}: {
  info: FSRSParameterInfo
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1">
      <label
        className="text-sm font-medium text-on-surface block"
        htmlFor={`fsrs-w-${info.index}`}
      >
        {info.label}
      </label>
      <Input
        id={`fsrs-w-${info.index}`}
        type="number"
        step="0.01"
        min="0"
        value={value != null && !isNaN(value) ? value.toFixed(4) : '0'}
        onChange={(e) => {
          const newValue = parseFloat(e.target.value)
          if (!isNaN(newValue) && newValue >= 0) {
            onChange(newValue)
          }
        }}
        className="font-mono text-sm"
      />
      <p className="text-xs text-on-surface-variant leading-relaxed">
        {info.description}
      </p>
    </div>
  )
}

export function ParameterSection({
  groupKey,
  parameters,
  startIndex,
  onChange,
}: ParameterSectionProps) {
  const group = FSRS_PARAMETER_GROUPS[groupKey]
  const groupParams = FSRS_PARAMETERS.filter((p) => p.group === groupKey)

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-on-surface">{group.title}</h4>
        <p className="text-sm text-on-surface-variant mt-1">
          {group.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupParams.map((info) => {
          const localIndex = info.index - startIndex
          return (
            <ParameterField
              key={info.index}
              info={info}
              value={parameters[localIndex] ?? 0}
              onChange={(value) => onChange(localIndex, value)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface AdvancedParametersPanelProps {
  parameters: number[]
  onChange: (index: number, value: number) => void
}

export function AdvancedParametersPanel({
  parameters,
  onChange,
}: AdvancedParametersPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-surface-container-low transition-colors"
        aria-expanded={open}
      >
        <div>
          <h3 className="font-semibold text-on-surface">
            Advanced algorithm weights
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            21 internal FSRS parameters. Only change these if you understand the
            algorithm.
          </p>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            'shrink-0 text-on-surface-variant transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-8 border-t border-outline pt-6">
          <ParameterSection
            groupKey="initial-stability"
            parameters={parameters}
            startIndex={0}
            onChange={onChange}
          />
          <ParameterSection
            groupKey="difficulty"
            parameters={parameters}
            startIndex={4}
            onChange={onChange}
          />
          <ParameterSection
            groupKey="stability-growth"
            parameters={parameters}
            startIndex={7}
            onChange={onChange}
          />
          <ParameterSection
            groupKey="lapse"
            parameters={parameters}
            startIndex={15}
            onChange={onChange}
          />
          <ParameterSection
            groupKey="reserved"
            parameters={parameters}
            startIndex={19}
            onChange={onChange}
          />
        </div>
      )}
    </Card>
  )
}
