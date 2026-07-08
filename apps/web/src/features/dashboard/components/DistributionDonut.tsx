import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { cn } from '@/shared/utils'

export interface DonutSegment {
  label: string
  value: number
  /** Hex or rgba color string passed directly to recharts Cell. */
  color: string
  [key: string]: unknown
}

interface DistributionDonutProps {
  segments: DonutSegment[]
  /** Value rendered in the ring centre. */
  centerValue: string | number
  /** Small mono label below the centre value. */
  centerLabel: string
  className?: string
  /** Outer diameter in px (default 140). */
  size?: number
}

type ChartEntry = {
  label: string
  value: number
  color: string
  [key: string]: unknown
}

/**
 * Glass-style donut built on recharts Pie.
 * Renders a placeholder ring when all segment values are zero.
 */
export function DistributionDonut({
  segments,
  centerValue,
  centerLabel,
  className,
  size = 140,
}: DistributionDonutProps) {
  const filled = segments.filter((s) => s.value > 0)
  const isEmpty = filled.length === 0

  const data: ChartEntry[] = isEmpty
    ? [{ label: '', value: 1, color: 'rgba(255,255,255,0.08)' }]
    : filled

  const innerRadius = Math.round(size * 0.37)
  const outerRadius = Math.round(size * 0.5)

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={isEmpty ? 0 : 3}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((seg, i) => (
              <Cell key={i} fill={String(seg.color)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label — overlaid as HTML to allow font-display + font-mono mix */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
        <span className="font-display text-2xl font-bold text-on-surface leading-none">
          {centerValue}
        </span>
        <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
          {centerLabel}
        </span>
      </div>
    </div>
  )
}
