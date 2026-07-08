import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { PromptModuleTypeSelect } from '@/features/helps/components/PromptModuleTypeSelect'
import {
  DEFAULT_PROMPT_MODULE_TYPE_ID,
  isPromptModuleTypeId,
  type PromptModuleTypeId,
} from '@/features/helps/domain/promptModules'
import type { Module } from '@/features/modules/types/module'

interface EditModuleModalProps {
  isOpen: boolean
  onClose: () => void
  module: Module | null
  onSave: (
    moduleId: string,
    data: {
      name: string
      description?: string
      sortOrder: number
      promptModuleTypeId: PromptModuleTypeId
    },
  ) => Promise<void>
  loading?: boolean
}

export function EditModuleModal({
  isOpen,
  onClose,
  module,
  onSave,
  loading = false,
}: EditModuleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [promptModuleTypeId, setPromptModuleTypeId] =
    useState<PromptModuleTypeId>(DEFAULT_PROMPT_MODULE_TYPE_ID)

  useEffect(() => {
    if (isOpen && module) {
      setName(module.name)
      setDescription(module.description || '')
      setSortOrder(module.sortOrder)
      setPromptModuleTypeId(
        isPromptModuleTypeId(module.promptModuleTypeId)
          ? module.promptModuleTypeId
          : DEFAULT_PROMPT_MODULE_TYPE_ID,
      )
    }
  }, [isOpen, module])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!module || !name.trim()) return
    await onSave(module.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      sortOrder,
      promptModuleTypeId,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Module">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
        data-testid="edit-module-form"
      >
        <div>
          <Label htmlFor="edit-module-name" className="block mb-2">
            Module Name
          </Label>
          <Input
            id="edit-module-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="edit-module-description" className="block mb-2">
            Description (Optional)
          </Label>
          <Textarea
            id="edit-module-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[96px]"
          />
        </div>

        <div>
          <Label htmlFor="edit-module-sort-order" className="block mb-2">
            Sort Order
          </Label>
          <Input
            id="edit-module-sort-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(Math.max(0, Number(e.target.value) || 0))
            }
          />
        </div>

        <PromptModuleTypeSelect
          id="edit-module-prompt-type"
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
          <Button type="submit" disabled={loading || !name.trim()}>
            <Save size={16} />
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
