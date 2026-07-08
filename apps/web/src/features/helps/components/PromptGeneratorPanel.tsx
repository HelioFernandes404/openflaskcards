import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Label } from '@/shared/components/label'
import { Select } from '@/shared/components/select'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { cn } from '@/shared/utils'
import {
  buildChatGptPromptUrl,
  canOpenChatGptWithPrompt,
  CHATGPT_BASE_URL,
} from '../domain/chatGptUrl'
import {
  buildModuleImagePrompt,
  DEFAULT_PROMPT_MODULE_TYPE_ID,
  getDefaultPromptTemplate,
  getPromptModuleType,
  PROMPT_MODULE_TYPES,
  type PromptModuleTypeId,
} from '../domain/promptModules'

interface PromptGeneratorPanelProps {
  initialModuleTypeId?: PromptModuleTypeId
}

export function PromptGeneratorPanel({
  initialModuleTypeId = DEFAULT_PROMPT_MODULE_TYPE_ID,
}: PromptGeneratorPanelProps) {
  const [moduleTypeId, setModuleTypeId] =
    useState<PromptModuleTypeId>(initialModuleTypeId)
  const [term, setTerm] = useState('')
  const [sentence, setSentence] = useState('')
  const { showToast } = useNotification()

  const moduleType = getPromptModuleType(moduleTypeId)
  const template = getDefaultPromptTemplate(moduleTypeId)
  const trimmedTerm = term.trim()
  const trimmedSentence = sentence.trim()
  const prompt = trimmedTerm
    ? buildModuleImagePrompt(
        moduleTypeId,
        trimmedTerm,
        template,
        trimmedSentence || undefined,
      )
    : ''

  const chatGptUrl = useMemo(
    () => (prompt ? buildChatGptPromptUrl(prompt) : null),
    [prompt],
  )
  const canDeepLink = canOpenChatGptWithPrompt(prompt)

  useEffect(() => {
    setModuleTypeId(initialModuleTypeId)
  }, [initialModuleTypeId])

  const handleCopy = useCallback(async () => {
    if (!prompt) return false
    try {
      await navigator.clipboard.writeText(prompt)
      return true
    } catch {
      showToast('Unable to copy — select the text and copy manually')
      return false
    }
  }, [prompt, showToast])

  const handleOpenChatGpt = useCallback(async () => {
    if (!prompt) return

    if (canDeepLink && chatGptUrl) {
      window.open(chatGptUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const copied = await handleCopy()
    if (copied) {
      window.open(CHATGPT_BASE_URL, '_blank', 'noopener,noreferrer')
      showToast(
        'Prompt copied — paste it in ChatGPT (prompt too long for a link)',
      )
    }
  }, [canDeepLink, chatGptUrl, handleCopy, prompt, showToast])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && prompt) {
        e.preventDefault()
        void handleOpenChatGpt()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleOpenChatGpt, prompt])

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-on-surface-variant">
        <li>Fill in the card's word and sentence</li>
        <li>Open in ChatGPT — the prompt is already filled</li>
        <li>Send it, generate the image, and attach it to the card</li>
      </ol>

      <div className="space-y-4 rounded-xl border border-outline bg-surface-container p-5 sm:p-6">
        <div>
          <Label htmlFor="pg-type" className="mb-2 block">
            Card type
          </Label>
          <Select
            id="pg-type"
            value={moduleTypeId}
            onChange={(e) =>
              setModuleTypeId(e.target.value as PromptModuleTypeId)
            }
          >
            {PROMPT_MODULE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-on-surface-variant">
            {moduleType.description}
          </p>
        </div>

        <div>
          <Label htmlFor="pg-term" className="mb-2 block">
            Word
          </Label>
          <Input
            id="pg-term"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={moduleType.placeholder.replace(/^e\.g\. /, '')}
          />
        </div>

        <div>
          <Label htmlFor="pg-sentence" className="mb-2 block">
            Sentence
          </Label>
          <Input
            id="pg-sentence"
            autoComplete="off"
            spellCheck={false}
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder={moduleType.sentencePlaceholder.replace(/^e\.g\. /, '')}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="pg-prompt">Generated prompt</Label>
        <textarea
          id="pg-prompt"
          readOnly
          value={prompt}
          rows={10}
          placeholder="Appears here once you fill in the word"
          onClick={(e) => e.currentTarget.select()}
          className={cn(
            'w-full rounded-md border border-outline bg-surface-container-low px-3 py-2.5',
            'text-sm leading-relaxed text-on-surface outline-none',
            'placeholder:text-on-surface-variant',
            'focus-visible:border-on-surface focus-visible:outline-2 focus-visible:outline-[rgba(236,237,241,0.15)] focus-visible:outline-offset-[2px]',
          )}
        />

        <Button
          className="w-full"
          size="lg"
          disabled={!prompt}
          onClick={() => void handleOpenChatGpt()}
        >
          <ExternalLink strokeWidth={1.5} />
          Open in ChatGPT
        </Button>

        <Button
          variant="neutral"
          size="lg"
          disabled={!prompt}
          className="w-full"
          onClick={() => void handleCopy()}
        >
          <Copy strokeWidth={1.5} />
          Just copy the prompt
        </Button>

        {!canDeepLink && prompt && (
          <p className="text-center text-xs text-on-surface-variant">
            Prompt too long for a link — use &quot;Just copy the prompt&quot;
            and paste it manually.
          </p>
        )}

        {canDeepLink && chatGptUrl && (
          <p className="text-center text-xs text-on-surface-variant">
            Opens ChatGPT with the prompt in the text field. Just press Enter to
            send.
          </p>
        )}
      </div>
    </div>
  )
}
