import { useState, useCallback } from 'react'
import {
  buildSheetsPrompt,
  PHONETIC_TYPE_LABELS,
  type PhoneticType,
} from '../utils/csvPrompt'
import { CopyPromptModal } from './CopyPromptModal'

interface CopyPromptButtonProps {
  onSuccess?: () => void
  onError?: () => void
}

export function CopyPromptButton({
  onSuccess,
  onError,
}: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [tema, setTema] = useState('')
  const [phoneticType, setPhoneticType] = useState<PhoneticType>('brasileirada')

  const generatedPrompt = buildSheetsPrompt(
    tema || '[INFORME O TEMA]',
    phoneticType,
  )

  const handleCopy = useCallback(async () => {
    if (!tema.trim()) {
      setShowForm(true)
      return
    }
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      onSuccess?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShowModal(true)
      onError?.()
    }
  }, [tema, generatedPrompt, onSuccess, onError])

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!tema.trim()) return
      try {
        await navigator.clipboard.writeText(generatedPrompt)
        setCopied(true)
        setShowForm(false)
        onSuccess?.()
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setShowForm(false)
        setShowModal(true)
        onError?.()
      }
    },
    [tema, generatedPrompt, onSuccess, onError],
  )

  if (showForm) {
    return (
      <form
        onSubmit={handleFormSubmit}
        className="flex flex-col gap-3 p-4 bg-surface-container-low rounded-lg border border-outline"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tema"
            className="text-sm font-medium text-on-surface-variant"
          >
            Flashcard topic
          </label>
          <input
            id="tema"
            type="text"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="e.g., Irregular English verbs, Travel vocabulary..."
            className="px-3 py-2 text-sm border border-outline rounded-md bg-surface-container text-on-surface
              placeholder:text-neutral-500 focus:outline-none focus:border-on-surface"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="phoneticType"
            className="text-sm font-medium text-on-surface-variant"
          >
            Phonetic type
          </label>
          <select
            id="phoneticType"
            value={phoneticType}
            onChange={(e) => setPhoneticType(e.target.value as PhoneticType)}
            className="px-3 py-2 text-sm border border-outline rounded-md bg-surface-container text-on-surface
              focus:outline-none focus:border-on-surface"
          >
            {(
              Object.entries(PHONETIC_TYPE_LABELS) as [PhoneticType, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!tema.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-on-primary
              hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed
              rounded-md transition-colors focus:outline-2 focus:outline-on-surface focus:outline-offset-[3px]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy prompt
          </button>
        </div>
      </form>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-on-surface-variant
          hover:text-on-surface hover:bg-surface-container
          rounded-md transition-colors focus:outline-2 focus:outline-on-surface focus:outline-offset-[3px]"
        aria-label="Generate prompt (Sheets)"
      >
        {copied ? (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Generate prompt (Sheets)
          </>
        )}
      </button>

      <CopyPromptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        prompt={generatedPrompt}
      />
    </>
  )
}
