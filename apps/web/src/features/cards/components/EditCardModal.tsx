import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { Input } from '@/shared/components/input'
import { ImageUploader } from './ImageUploader'
import { cardToEditDraft, type CardEditDraft } from '../domain/cardPreview'
import type { Card, CardUpdateInput } from '../types/card'

const PREVIEW_DEBOUNCE_MS = 120

function debouncePreview(callback: () => void, delayMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const debounced = () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delayMs)
  }

  debounced.cancel = () => {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  debounced.flush = () => {
    clearTimeout(timeoutId)
    timeoutId = undefined
    callback()
  }

  return debounced
}

interface EditCardModalProps {
  isOpen: boolean
  onClose: () => void
  card: Card | null
  onSave: (cardId: string, data: CardUpdateInput) => Promise<void>
  onDraftChange?: (draft: CardEditDraft) => void
  loading?: boolean
}

export function EditCardModal({
  isOpen,
  onClose,
  card,
  onSave,
  onDraftChange,
  loading = false,
}: EditCardModalProps) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [fonetica, setFonetica] = useState('')
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(undefined)
  const draftRef = useRef<CardEditDraft>({
    front: '',
    back: '',
    phonetic: '',
  })

  const publishDraft = useCallback(() => {
    onDraftChange?.(draftRef.current)
  }, [onDraftChange])

  const debouncedPublishDraft = useMemo(
    () => debouncePreview(publishDraft, PREVIEW_DEBOUNCE_MS),
    [publishDraft],
  )

  useEffect(() => () => debouncedPublishDraft.cancel(), [debouncedPublishDraft])

  const syncDraft = useCallback(
    (patch: Partial<CardEditDraft>, immediate = false) => {
      draftRef.current = { ...draftRef.current, ...patch }
      if (immediate) {
        debouncedPublishDraft.flush()
        return
      }
      debouncedPublishDraft()
    },
    [debouncedPublishDraft],
  )

  useEffect(() => {
    if (isOpen && card) {
      const draft = cardToEditDraft(card)
      draftRef.current = draft
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFront(draft.front)
      setBack(draft.back)
      setFonetica(draft.phonetic)
      setImagemUrl(draft.imagemUrl)
    }
  }, [isOpen, card])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card || !front.trim() || !back.trim()) return

    debouncedPublishDraft.flush()

    await onSave(card.id, {
      front: front.trim(),
      back: back.trim(),
      fonetica: fonetica.trim() || undefined,
      imagemUrl,
    })
    onClose()
  }

  const handleClose = () => {
    if (!loading) {
      debouncedPublishDraft.cancel()
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Card"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <Label
            htmlFor="edit-front"
            className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70"
          >
            Word / Phrase (English)
          </Label>
          <Textarea
            id="edit-front"
            className="min-h-[80px] text-lg"
            placeholder="Enter the word or phrase in English..."
            value={front}
            onChange={(e) => {
              const nextFront = e.target.value
              setFront(nextFront)
              syncDraft({ front: nextFront })
            }}
            disabled={loading}
            autoFocus
          />
        </div>

        <div>
          <Label
            htmlFor="edit-fonetica"
            className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70"
          >
            Pronunciation (Brazilian-readable)
          </Label>
          <Input
            id="edit-fonetica"
            className="text-lg font-mono"
            placeholder="e.g., /ske-dju-ler/ or /DÔU/"
            value={fonetica}
            onChange={(e) => {
              const nextFonetica = e.target.value
              setFonetica(nextFonetica)
              syncDraft({ phonetic: nextFonetica })
            }}
            disabled={loading}
          />
          <p className="text-xs mt-1 opacity-50">
            Use simple phonetics readable in Portuguese. No IPA symbols.
          </p>
        </div>

        <div>
          <Label
            htmlFor="edit-back"
            className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70"
          >
            Meaning (Portuguese)
          </Label>
          <Textarea
            id="edit-back"
            className="min-h-[100px] text-lg bg-surface-container"
            placeholder="Enter the translation or definition..."
            value={back}
            onChange={(e) => {
              const nextBack = e.target.value
              setBack(nextBack)
              syncDraft({ back: nextBack })
            }}
            disabled={loading}
          />
        </div>

        <div>
          <Label className="block font-bold text-sm uppercase tracking-wider mb-2 opacity-70">
            Image (optional)
          </Label>
          <ImageUploader
            value={imagemUrl}
            onChange={(nextImagemUrl) => {
              setImagemUrl(nextImagemUrl)
              syncDraft({ imagemUrl: nextImagemUrl }, true)
            }}
            disabled={loading}
          />
        </div>

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
            disabled={loading || !front.trim() || !back.trim()}
          >
            <Save size={20} /> {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
