import type { LucideProps } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import { Card, CardContent } from '@/shared/components/card'
import { Badge } from '@/shared/components/badge'
import { cn } from '@/shared/utils'

/** Semantic tone roles using oklch support colors */
export type StatCardTone = 'primary' | 'secondary' | 'tertiary' | 'neutral'

interface ToneStyle {
  bg: string
  border: string
  icon: string
}

const TONE_STYLES: Record<StatCardTone, ToneStyle> = {
  primary: {
    bg: 'bg-info-50',
    border: 'border-info-200',
    icon: 'text-info-600',
  },
  secondary: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    icon: 'text-warning-600',
  },
  tertiary: {
    bg: 'bg-success-50',
    border: 'border-success-200',
    icon: 'text-success-600',
  },
  neutral: {
    bg: 'bg-surface-container-high',
    border: 'border-outline',
    icon: 'text-on-surface-variant',
  },
}

interface StatCardProps {
  icon: ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>
  label: string
  value: string | number
  trend?: string
  tone?: StatCardTone
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  tone = 'neutral',
}: StatCardProps) {
  const styles = TONE_STYLES[tone]

  return (
    <Card className="transition-all hover:-translate-y-0.5 cursor-default">
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className={cn(
            'p-3 rounded-xl border shrink-0 flex items-center justify-center',
            styles.bg,
            styles.border,
          )}
        >
          <Icon size={20} className={styles.icon} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant mb-1">
            {label}
          </p>
          <div className="flex items-end gap-2">
            <span className="font-display text-2xl font-semibold text-on-surface leading-tight">
              {value}
            </span>
            {trend && (
              <Badge
                variant="neutral"
                className="font-mono text-2xs mb-0.5 px-1.5"
              >
                {trend}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
