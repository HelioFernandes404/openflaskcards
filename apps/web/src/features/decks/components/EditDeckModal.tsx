import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { DeckModuleSelect } from '@/features/modules/components/DeckModuleSelect'
import type { Deck } from '../types/deck'
import type { Module } from '@/features/modules/types/module'

interface EditDeckModalProps {
  isOpen: boolean
  onClose: () => void
  deck: Deck | null
  modules: Module[]
  onSave: (
    deckId: string,
    data: {
      name: string
      description?: string
      newCardsDailyLimit?: number
      moduleId?: string | null
    },
  ) => Promise<void>
  loading?: boolean
}

export function EditDeckModal({
  isOpen,
  onClose,
  deck,
  modules,
  onSave,
  loading = false,
}: EditDeckModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [newCardsDailyLimit, setNewCardsDailyLimit] = useState(10)
  const [moduleId, setModuleId] = useState<string | null>(null)

  // Initialize state when modal opens with a deck
  useEffect(() => {
    if (isOpen && deck) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(deck.name)

      setDescription(deck.description || '')
      setNewCardsDailyLimit(deck.newCardsDailyLimit ?? 10)
      setModuleId(deck.moduleId ?? null)
    }
  }, [isOpen, deck])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deck || !name.trim()) return

    await onSave(deck.id, {
      name: name.trim(),
      description: description.trim(),
      newCardsDailyLimit,
      moduleId,
    })
    onClose()
  }

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setNewCardsDailyLimit(Math.max(0, Math.min(200, value)))
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Deck">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <Label
            htmlFor="edit-name"
            className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70"
          >
            Deck Title
          </Label>
          <Input
            id="edit-name"
            type="text"
            className="text-xl"
            placeholder="e.g. Advanced Calculus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <div>
          <Label
            htmlFor="edit-description"
            className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70"
          >
            Description (Optional)
          </Label>
          <Textarea
            id="edit-description"
            className="min-h-[120px]"
            placeholder="What is this deck about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <Label
            htmlFor="edit-newCardsDailyLimit"
            className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70"
          >
            New Cards Per Day
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="edit-newCardsDailyLimit"
              type="number"
              min={0}
              max={200}
              className="w-24 text-center text-xl"
              value={newCardsDailyLimit}
              onChange={handleLimitChange}
              disabled={loading}
            />
            <span className="text-sm opacity-60">cards/day (0-200)</span>
          </div>
          <p className="text-xs opacity-50 mt-1">
            Limits how many new cards you can study each day in this deck.
          </p>
        </div>

        <DeckModuleSelect
          id="edit-module"
          modules={modules}
          value={moduleId}
          onChange={setModuleId}
          disabled={loading}
        />

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="neutral"
            className="flex-1 py-3 text-lg"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-[2] py-3 text-lg gap-2"
            disabled={loading || !name.trim()}
          >
            <Save size={20} /> {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
