import { useCallback, useRef } from 'react'
import { Modal } from '@/shared/components/modal'
import { Button } from '@/shared/components/button'

interface CopyPromptModalProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
}

export function CopyPromptModal({
  isOpen,
  onClose,
  prompt,
}: CopyPromptModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSelectAll = useCallback(() => {
    textareaRef.current?.select()
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Copy Prompt" maxWidth="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-on-surface-variant">
          Unable to copy automatically. Select the text below and copy manually
          (Ctrl+C / Cmd+C).
        </p>

        <textarea
          ref={textareaRef}
          readOnly
          value={prompt}
          onClick={handleSelectAll}
          className="w-full h-64 p-3 text-sm font-mono bg-surface-container-low
            border border-outline rounded-md resize-none
            focus:outline-none focus:ring-2 focus:outline-on-surface"
        />

        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
