import { useMemo } from 'react'
import { Card } from '@/shared/components/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/chart'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  daysUntilDue,
  FSRS_DEFAULT_DECAY,
  retentionCurve,
  retrievability,
} from '@/features/study/utils/fsrsRetrievability'

interface ForgettingCurveChartProps {
  stability: number
  desiredRetention: number
  /** Negated w[20] from the user's FSRS parameters; falls back to the backend default. */
  decay?: number
}

function formatDays(value: number) {
  if (value === 0) return '0d'
  if (value < 10) return `${value.toFixed(1)}d`
  return `${Math.round(value)}d`
}

export function ForgettingCurveChart({
  stability,
  desiredRetention,
  decay,
}: ForgettingCurveChartProps) {
  const safeStability = stability > 0 ? stability : 5
  const safeRetention =
    desiredRetention > 0 && desiredRetention <= 1 ? desiredRetention : 0.9
  const safeDecay = decay != null && decay < 0 ? decay : FSRS_DEFAULT_DECAY
  const targetPercent = safeRetention * 100

  const dueDate = useMemo(
    () => daysUntilDue(safeStability, safeRetention, safeDecay),
    [safeStability, safeRetention, safeDecay],
  )

  const horizonDays = useMemo(
    () => Math.min(Math.max(dueDate * 2.2, safeStability * 1.8, 14), 120),
    [dueDate, safeStability],
  )

  const curveData = useMemo(
    () => retentionCurve(safeStability, horizonDays, 80, safeDecay),
    [safeStability, horizonDays, safeDecay],
  )

  const recallAtDue = retrievability(dueDate, safeStability, safeDecay) * 100

  const chartConfig = {
    recall: {
      label: 'Recall',
      color: 'var(--chart-2)',
    },
    target: {
      label: 'Target',
      color: 'var(--chart-4)',
    },
  }

  return (
    <Card className="p-5 w-full flex flex-col gap-4">
      <div className="h-[260px] w-full">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full [&_.recharts-cartesian-grid_line]:stroke-outline/40"
        >
          <ComposedChart
            data={curveData}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="recallFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, horizonDays]}
              tickFormatter={formatDays}
              tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
              tickLine={false}
              axisLine={false}
              tickCount={6}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickCount={5}
            />

            <ChartTooltip
              cursor={{
                stroke: 'var(--color-outline)',
                strokeDasharray: '4 4',
              }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const day = payload?.[0]?.payload?.day
                    return day != null ? `Day ${formatDays(day)}` : ''
                  }}
                  formatter={(value) => `${Number(value).toFixed(1)}% recall`}
                />
              }
            />

            <ReferenceArea
              x1={0}
              x2={dueDate}
              y1={targetPercent}
              y2={100}
              fill="var(--chart-3)"
              fillOpacity={0.06}
              strokeOpacity={0}
            />

            <Area
              type="monotone"
              dataKey="recall"
              stroke="none"
              fill="url(#recallFill)"
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="recall"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            <ReferenceLine
              y={targetPercent}
              stroke="var(--chart-4)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              label={{
                value: `Target ${targetPercent.toFixed(0)}%`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: 'var(--chart-4)',
              }}
            />

            <ReferenceLine
              x={dueDate}
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />

            <ReferenceDot
              x={dueDate}
              y={recallAtDue}
              r={5}
              fill="var(--chart-2)"
              stroke="var(--color-surface-container)"
              strokeWidth={2}
              label={{
                value: `Review at ${formatDays(dueDate)}`,
                position: 'top',
                fontSize: 11,
                fill: 'var(--color-on-surface)',
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-[var(--chart-2)]" />
          Memory decay
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border border-dashed border-[var(--chart-4)]" />
          Target retention
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />
          Scheduled review
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-outline bg-surface-container-low px-3 py-2.5 text-center">
          <p className="text-lg font-semibold tabular-nums text-on-surface">
            {safeStability.toFixed(1)}d
          </p>
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-0.5">
            Example stability
          </p>
        </div>
        <div className="rounded-lg border border-outline bg-surface-container-low px-3 py-2.5 text-center">
          <p className="text-lg font-semibold tabular-nums text-on-surface">
            {targetPercent.toFixed(0)}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-0.5">
            Your target
          </p>
        </div>
        <div className="rounded-lg border border-outline bg-surface-container-low px-3 py-2.5 text-center">
          <p className="text-lg font-semibold tabular-nums text-on-surface">
            {dueDate < 1 ? dueDate.toFixed(1) : dueDate.toFixed(0)}d
          </p>
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mt-0.5">
            Next review
          </p>
        </div>
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed">
        Example card with {safeStability.toFixed(1)}-day stability: memory drops
        to your {targetPercent.toFixed(0)}% target after about{' '}
        {dueDate < 1 ? dueDate.toFixed(1) : dueDate.toFixed(0)} days, when FSRS
        schedules the next review.
      </p>
    </Card>
  )
}
