import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/shared/components/button'
import { cn } from '@/shared/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
  className,
}: PageHeaderProps) {
  const router = useRouter()

  useEffect(() => {
    document.title = `${title} — Flashcards`
    return () => {
      document.title = 'Flashcards'
    }
  }, [title])

  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {backTo && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg mt-0.5"
            onClick={() => router.navigate({ href: backTo })}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </header>
  )
}
