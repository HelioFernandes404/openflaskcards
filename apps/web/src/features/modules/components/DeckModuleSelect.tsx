import { Label } from '@/shared/components/label'
import { Select } from '@/shared/components/select'
import type { Module } from '@/features/modules/types/module'

interface DeckModuleSelectProps {
  id: string
  modules: Module[]
  value: string | null
  onChange: (moduleId: string | null) => void
  disabled?: boolean
  compact?: boolean
  className?: string
}

export function DeckModuleSelect({
  id,
  modules,
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: DeckModuleSelectProps) {
  return (
    <div className={className}>
      {!compact ? (
        <Label htmlFor={id} className="block mb-2">
          Module (optional)
        </Label>
      ) : null}
      <Select
        id={id}
        data-testid={id}
        value={value ?? ''}
        disabled={disabled}
        className={compact ? 'h-9 text-xs' : undefined}
        aria-label={compact ? 'Deck module' : undefined}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">No Module</option>
        {modules.map((module) => (
          <option key={module.id} value={module.id}>
            {module.name}
          </option>
        ))}
      </Select>
    </div>
  )
}
