import { useEffect, type ComponentProps, type ReactNode } from 'react'
import { Layers, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Input } from '@/shared/components/input'
import { Label } from '@/shared/components/label'
import { Card } from '@/shared/components/card'

interface AuthCardProps {
  /** data-testid for the page wrapper */
  pageTestId: string
  title: string
  subtitle: string
  error?: string | null
  errorTestId?: string
  children: ReactNode
  footer: ReactNode
}

/** Shared layout for the Login/Register screens: logo header, title, error alert, footer link. */
export function AuthCard({
  pageTestId,
  title,
  subtitle,
  error,
  errorTestId,
  children,
  footer,
}: AuthCardProps) {
  useEffect(() => {
    document.title = `${title} — Flashcards`
    return () => {
      document.title = 'Flashcards'
    }
  }, [title])

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center p-4"
      data-testid={pageTestId}
    >
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="w-16 h-16 bg-primary border border-outline rounded-xl flex items-center justify-center">
            <Layers size={36} className="text-on-primary" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight mb-1">
              {title}
            </h1>
            <p className="text-sm font-base text-on-surface-variant">
              {subtitle}
            </p>
          </div>
        </div>

        {error && (
          <div
            className="bg-danger-50 border border-danger-200 p-4 rounded-md flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-top-2"
            data-testid={errorTestId}
          >
            <AlertCircle
              className="text-danger-800 shrink-0 mt-0.5"
              size={18}
              strokeWidth={1.5}
            />
            <p className="text-sm font-base text-danger-800">{error}</p>
          </div>
        )}

        {children}

        <div className="mt-8 text-center">
          <p className="text-sm font-base text-on-surface-variant">{footer}</p>
        </div>
      </Card>
    </div>
  )
}

interface AuthFieldProps extends ComponentProps<typeof Input> {
  id: string
  label: string
  /** Optional leading icon; when present the input gets left padding. */
  icon?: LucideIcon
}

/** Labelled input with optional leading icon, used across auth forms. */
export function AuthField({
  id,
  label,
  icon: Icon,
  className,
  ...inputProps
}: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="uppercase text-xs tracking-wide">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={16}
            strokeWidth={1.5}
          />
        )}
        <Input
          id={id}
          className={`${Icon ? 'pl-9 ' : ''}font-medium${className ? ` ${className}` : ''}`}
          {...inputProps}
        />
      </div>
    </div>
  )
}
