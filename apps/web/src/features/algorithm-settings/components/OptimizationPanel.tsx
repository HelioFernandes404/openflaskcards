import { Button } from '@/shared/components/button'
import { Spinner } from '@/shared/components/spinner'

const STATUS_LABELS: Record<string, string> = {
  idle: 'Not optimized yet',
  running: 'Optimizing…',
  completed: 'Last run succeeded',
  insufficient_data: 'Need more review history',
  failed: 'Last run failed',
}

interface OptimizationPanelProps {
  status: string | null | undefined
  lastOptimization: string | null | undefined
  isOptimizing: boolean
  onOptimize: () => void
}

export function OptimizationPanel({
  status,
  lastOptimization,
  isOptimizing,
  onOptimize,
}: OptimizationPanelProps) {
  const normalizedStatus = status ?? 'idle'
  const statusLabel = STATUS_LABELS[normalizedStatus] ?? normalizedStatus
  const busy = isOptimizing || normalizedStatus === 'running'

  return (
    <section className="mb-8 rounded-lg border border-outline bg-surface-container-low p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Optimize from review history
          </h3>
          <p className="max-w-2xl text-sm text-on-surface-variant">
            Fit FSRS weights and target retention to your actual reviews using
            the official fsrs-rs optimizer. Requires at least 100 logged
            reviews.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
            <span data-testid="fsrs-optimization-status">
              Status: {statusLabel}
            </span>
            {lastOptimization && (
              <span data-testid="fsrs-last-optimization">
                Last run: {new Date(lastOptimization).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <Button
          data-testid="fsrs-optimize-button"
          className="shrink-0"
          onClick={onOptimize}
          disabled={busy}
        >
          {busy ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Running…
            </>
          ) : (
            'Run optimization'
          )}
        </Button>
      </div>
    </section>
  )
}
