import { cn } from '@/shared/utils'
import type { StudyPlanWeekDay } from '../domain/studyPlanProgress'

interface StudyPlanWeekStripProps {
  days: StudyPlanWeekDay[]
}

export function StudyPlanWeekStrip({ days }: StudyPlanWeekStripProps) {
  return (
    <div
      className="space-y-2"
      data-testid="study-plan-week-strip"
      aria-label="Last 7 days"
    >
      <p className="font-mono text-[11px] tracking-widest uppercase text-on-surface-variant">
        Last 7 days
      </p>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <li key={day.dateKey} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                'font-mono text-[10px] uppercase tracking-wide',
                day.isToday ? 'text-on-surface' : 'text-on-surface-variant',
              )}
            >
              {day.weekdayLabel}
            </span>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border transition-colors',
                day.status === 'full' &&
                  'border-success-600 bg-success-600 text-on-success ring-2 ring-success-600/25',
                day.status === 'win' &&
                  'border-primary bg-primary text-on-primary',
                day.status === 'none' && 'border-outline bg-transparent',
                day.isToday && day.status === 'none' && 'border-outline-strong',
              )}
              aria-label={`${day.dateKey}: ${day.status === 'full' ? 'full session' : day.status === 'win' ? 'day saved' : 'no win yet'}`}
              data-testid={`study-plan-week-day-${day.dateKey}`}
            >
              {day.status === 'full' ? (
                <span
                  className="size-2 rounded-full bg-on-success"
                  aria-hidden
                />
              ) : day.status === 'win' ? (
                <span
                  className="size-2 rounded-full bg-on-primary"
                  aria-hidden
                />
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      <p className="font-mono text-2xs text-on-surface-variant">
        Filled = step 1 done · ring = full session
      </p>
    </div>
  )
}
