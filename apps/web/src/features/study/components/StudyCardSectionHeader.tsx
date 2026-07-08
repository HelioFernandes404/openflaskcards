import { cn } from '@/shared/utils'

interface StudyCardSectionHeaderProps {
  label: string
  className?: string
}

export function StudyCardSectionHeader({
  label,
  className,
}: StudyCardSectionHeaderProps) {
  return (
    <div className={cn('px-4 pt-3 pb-1', className)}>
      <span className="font-mono text-2xs uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
    </div>
  )
}
