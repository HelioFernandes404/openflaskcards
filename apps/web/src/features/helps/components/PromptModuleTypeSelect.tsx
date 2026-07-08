import { Label } from '@/shared/components/label'
import { Select } from '@/shared/components/select'
import {
  DEFAULT_PROMPT_MODULE_TYPE_ID,
  PROMPT_MODULE_TYPES,
  type PromptModuleTypeId,
} from '../domain/promptModules'

interface PromptModuleTypeSelectProps {
  id: string
  value: PromptModuleTypeId
  onChange: (value: PromptModuleTypeId) => void
}

export function PromptModuleTypeSelect({
  id,
  value,
  onChange,
}: PromptModuleTypeSelectProps) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block">
        Image prompt type
      </Label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as PromptModuleTypeId)}
      >
        {PROMPT_MODULE_TYPES.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label} — {type.description}
          </option>
        ))}
      </Select>
      <p className="mt-2 text-xs text-on-surface-variant">
        Used by Prompt Help when generating card images for decks in this
        module.
      </p>
    </div>
  )
}

export { DEFAULT_PROMPT_MODULE_TYPE_ID }
