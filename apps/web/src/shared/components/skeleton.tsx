import type * as React from 'react'
import { cn } from '../utils'

interface SkeletonProps extends React.ComponentProps<'div'> {
  /** Shape variant */
  variant?: 'default' | 'text' | 'circular' | 'rectangular'
  /** Width (CSS value or Tailwind class) */
  width?: string
  /** Height (CSS value or Tailwind class) */
  height?: string
}

/**
 * Base Skeleton component for loading placeholders.
 * Uses animate-pulse for the loading animation.
 */
function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-base',
    text: 'rounded-base h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-surface-container',
        variantClasses[variant],
        className,
      )}
      style={{
        width: width?.startsWith('w-') ? undefined : width,
        height: height?.startsWith('h-') ? undefined : height,
        ...style,
      }}
      {...props}
    />
  )
}

/** Text line skeleton with configurable lines */
interface SkeletonTextProps extends React.ComponentProps<'div'> {
  lines?: number
  lastLineWidth?: string
}

function SkeletonText({
  className,
  lines = 3,
  lastLineWidth = 'w-3/4',
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn('h-4', i === lines - 1 ? lastLineWidth : 'w-full')}
        />
      ))}
    </div>
  )
}

/** Avatar/circular skeleton */
interface SkeletonAvatarProps extends React.ComponentProps<'div'> {
  size?: 'sm' | 'md' | 'lg'
}

function SkeletonAvatar({
  className,
  size = 'md',
  ...props
}: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  return (
    <Skeleton
      variant="circular"
      className={cn(sizeClasses[size], className)}
      {...props}
    />
  )
}

/** Card skeleton matching the neobrutalism Card component layout */
interface SkeletonCardProps extends React.ComponentProps<'div'> {
  showAvatar?: boolean
  showFooter?: boolean
}

function SkeletonCard({
  className,
  showAvatar = false,
  showFooter = true,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl flex flex-col border border-outline gap-6 py-6 bg-surface-container-low animate-pulse',
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="px-6 flex items-start gap-4">
        {showAvatar && <SkeletonAvatar />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        <SkeletonText lines={3} />
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="px-6 flex gap-2">
          <Skeleton className="h-9 w-24 rounded-base" />
          <Skeleton className="h-9 w-24 rounded-base" />
        </div>
      )}
    </div>
  )
}

/** Table row skeleton */
interface SkeletonTableRowProps extends React.ComponentProps<'tr'> {
  columns?: number
}

function SkeletonTableRow({
  className,
  columns = 4,
  ...props
}: SkeletonTableRowProps) {
  return (
    <tr
      className={cn('animate-pulse', className)}
      aria-hidden="true"
      {...props}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/** Table skeleton with configurable rows and columns */
interface SkeletonTableProps extends React.ComponentProps<'div'> {
  rows?: number
  columns?: number
  showHeader?: boolean
}

function SkeletonTable({
  className,
  rows = 5,
  columns = 4,
  showHeader = true,
  ...props
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'w-full rounded-md border border-outline overflow-hidden',
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      <table className="w-full">
        {showHeader && (
          <thead className="bg-surface-container-lowest">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Chart skeleton */
interface SkeletonChartProps extends React.ComponentProps<'div'> {
  type?: 'bar' | 'line' | 'pie'
}

function SkeletonChart({
  className,
  type = 'bar',
  ...props
}: SkeletonChartProps) {
  if (type === 'pie') {
    return (
      <div
        className={cn('flex items-center justify-center p-8', className)}
        aria-hidden="true"
        {...props}
      >
        <Skeleton variant="circular" className="h-48 w-48" />
      </div>
    )
  }

  return (
    <div
      className={cn('p-4 space-y-4', className)}
      aria-hidden="true"
      {...props}
    >
      {/* Chart area */}
      <div className="flex items-end gap-2 h-40">
        {[70, 45, 85, 55, 75, 40, 60].map((height, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-base"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-3" />
        ))}
      </div>
    </div>
  )
}

/** Activity grid skeleton for generic heatmaps. */
interface SkeletonActivityGridProps extends React.ComponentProps<'div'> {
  weeks?: number
  days?: number
}

function SkeletonActivityGrid({
  className,
  weeks = 12,
  days = 7,
  ...props
}: SkeletonActivityGridProps) {
  return (
    <div
      className={cn('flex gap-1 overflow-hidden', className)}
      aria-hidden="true"
      {...props}
    >
      {Array.from({ length: weeks }).map((_, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {Array.from({ length: days }).map((_, dayIndex) => (
            <Skeleton key={dayIndex} className="w-3 h-3 rounded-sm" />
          ))}
        </div>
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonChart,
  SkeletonActivityGrid,
}
