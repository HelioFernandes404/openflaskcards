interface ImportProgressProps {
  current: number
  total: number
}

export function ImportProgress({ current, total }: ImportProgressProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">Importing cards...</span>
        <span className="font-medium text-neutral-900">
          {current} / {total}
        </span>
      </div>

      <div className="w-full bg-neutral-200 rounded-full h-2.5">
        <div
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-neutral-500 text-center">
        {percentage}% completed
      </p>
    </div>
  )
}
