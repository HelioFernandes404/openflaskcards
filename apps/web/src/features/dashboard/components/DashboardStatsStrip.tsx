import { Skeleton } from '@/shared/components/skeleton'
import { cn } from '@/shared/utils'

interface StatItem {
  label: string
  value: string | number
}

interface DashboardStatsStripProps {
  items: StatItem[]
  loading?: boolean
  className?: string
}

export function DashboardStatsStrip({
  items,
  loading,
  className,
}: DashboardStatsStripProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden',
        className,
      )}
      aria-label="Statistics"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-outline-variant">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-3 sm:px-5 sm:py-3.5">
            <p className="font-mono text-2xs uppercase tracking-wider text-muted mb-1">
              {item.label}
            </p>
            {loading ? (
              <Skeleton className="h-6 w-10 rounded-sm" />
            ) : (
              <p className="font-display text-xl font-semibold text-on-surface tabular-nums leading-none">
                {item.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
