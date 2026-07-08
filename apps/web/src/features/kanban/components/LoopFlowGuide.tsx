import { useCallback, useState } from 'react'
import { Bot, Check, Copy, User } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { LOOP_CARD_TEMPLATE, LOOP_HELP_STEPS } from '../domain/loopHelp'

function CopyCommandButton({
  stepId,
  command,
}: {
  stepId: string
  command: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — nothing to do
    }
  }, [command])

  return (
    <Button
      variant="ghost"
      size="icon"
      data-testid={`loop-help-copy-${stepId}`}
      className="size-8 shrink-0"
      onClick={() => void handleCopy()}
      aria-label={`Copy ${command}`}
    >
      {copied ? (
        <Check size={14} strokeWidth={1.5} className="text-success-600" />
      ) : (
        <Copy size={14} strokeWidth={1.5} />
      )}
    </Button>
  )
}

export function LoopFlowGuide() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-on-surface-variant leading-relaxed">
        This board is the external memory of a maker/judge agent loop. Agents
        read and move cards through the{' '}
        <code className="font-mono">openflaskcards</code> CLI from Claude Code —
        you steer through two gates: promoting backlog cards and merging PRs.
      </p>

      <ol className="flex flex-col gap-4">
        {LOOP_HELP_STEPS.map((step) => (
          <li
            key={step.id}
            data-testid={`loop-help-step-${step.id}`}
            className="rounded-lg border border-outline bg-surface-container-low p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              {step.actor === 'human' ? (
                <User size={16} strokeWidth={1.5} className="text-primary" />
              ) : (
                <Bot
                  size={16}
                  strokeWidth={1.5}
                  className="text-on-surface-variant"
                />
              )}
              <h3 className="text-sm font-semibold text-on-surface">
                {step.title}
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {step.description}
            </p>
            {step.command && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-surface-container-high px-3 py-2">
                <div className="flex flex-col gap-1 font-mono text-xs text-on-surface">
                  <span>{step.command}</span>
                  {step.commandHint && (
                    <span className="text-on-surface-variant">
                      {step.commandHint}
                    </span>
                  )}
                </div>
                <CopyCommandButton stepId={step.id} command={step.command} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-on-surface">
          Card template
        </h3>
        <p className="mb-2 text-sm text-on-surface-variant">
          Every card entering the loop needs a done condition the judge can
          verify by running commands — cards without one are sent back to
          backlog.
        </p>
        <pre
          data-testid="loop-help-card-template"
          className="overflow-x-auto rounded-lg border border-outline bg-surface-container-high p-4 font-mono text-xs text-on-surface whitespace-pre-wrap"
        >
          {LOOP_CARD_TEMPLATE}
        </pre>
      </section>
    </div>
  )
}
