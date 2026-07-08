import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import {
  DEFAULT_PROMPT_MODULE_TYPE_ID,
  PromptModuleTypeSelect,
} from '@/features/helps/components/PromptModuleTypeSelect'
import type { PromptModuleTypeId } from '@/features/helps/domain/promptModules'

interface CreateModuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    description?: string
    sortOrder: number
    promptModuleTypeId: PromptModuleTypeId
  }) => Promise<void>
  loading?: boolean
  nextSortOrder?: number
}

export function CreateModuleModal({
  isOpen,
  onClose,
  onSave,
  loading = false,
  nextSortOrder = 0,
}: CreateModuleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(nextSortOrder)
  const [promptModuleTypeId, setPromptModuleTypeId] =
    useState<PromptModuleTypeId>(DEFAULT_PROMPT_MODULE_TYPE_ID)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setSortOrder(nextSortOrder)
      setPromptModuleTypeId(DEFAULT_PROMPT_MODULE_TYPE_ID)
    }
  }, [isOpen, nextSortOrder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      sortOrder,
      promptModuleTypeId,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Module">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
        data-testid="create-module-form"
      >
        <div>
          <Label htmlFor="module-name" className="block mb-2">
            Module Name
          </Label>
          <Input
            id="module-name"
            data-testid="create-module-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Module 1"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="module-description" className="block mb-2">
            Description (Optional)
          </Label>
          <Textarea
            id="module-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this module cover?"
            className="min-h-[96px]"
          />
        </div>

        <div>
          <Label htmlFor="module-sort-order" className="block mb-2">
            Sort Order
          </Label>
          <Input
            id="module-sort-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(Math.max(0, Number(e.target.value) || 0))
            }
          />
        </div>

        <PromptModuleTypeSelect
          id="create-module-prompt-type"
          value={promptModuleTypeId}
          onChange={setPromptModuleTypeId}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            data-testid="create-module-submit"
          >
            <Save size={16} />
            Create Module
          </Button>
        </div>
      </form>
    </Modal>
  )
}
