import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/shared/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/tooltip'
import { formatCardCliSnippet } from '@/features/cards/utils/cardCliSnippet'
import { useNotification } from '@/shared/providers/NotificationProvider'

interface CopyCardCliButtonProps {
  cardId?: string
}

export function CopyCardCliButton({ cardId }: CopyCardCliButtonProps) {
  const { showToast } = useNotification()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!cardId) return
    try {
      await navigator.clipboard.writeText(formatCardCliSnippet(cardId))
      showToast('CLI command copied', 'success')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy CLI command', 'error')
    }
  }, [cardId, showToast])

  const cliCommand = cardId ? formatCardCliSnippet(cardId) : undefined
  const tooltipLabel = copied
    ? 'CLI command copied'
    : (cliCommand ?? 'Copy CLI command')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            data-testid="study-session-copy-cli-button"
            className="size-10 shrink-0 rounded-none border-0 border-r border-outline shadow-none hover:bg-surface-container hover:border-outline"
            onClick={() => void handleCopy()}
            disabled={!cardId}
            aria-label="Copy CLI command"
          >
            {copied ? (
              <Check size={16} strokeWidth={1.5} className="text-success-600" />
            ) : (
              <Copy size={16} strokeWidth={1.5} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
