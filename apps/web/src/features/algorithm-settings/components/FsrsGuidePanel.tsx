import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/shared/components/card'
import { cn } from '@/shared/utils'

const CARD_STATES = [
  {
    state: 'New',
    meaning:
      'Never reviewed. Shown when you still have new-card quota for the deck.',
  },
  {
    state: 'Learning',
    meaning: 'Short intervals while early learning steps are still active.',
  },
  { state: 'Review', meaning: 'Graduated — intervals are measured in days.' },
  {
    state: 'Relearning',
    meaning:
      'You pressed Again on a review card; short steps before it returns to review.',
  },
] as const

const NEW_CARD_PREVIEWS = [
  { rating: 'Again', interval: '+1 min', note: 'First learning step' },
  {
    rating: 'Hard',
    interval: '+6 min',
    note: 'Average of the two default steps',
  },
  {
    rating: 'Good',
    interval: '+10 min',
    note: 'Second step; card stays in learning',
  },
  {
    rating: 'Easy',
    interval: 'Days',
    note: 'Graduates immediately using the Easy first-interval weight (w[3])',
  },
] as const

function GuideSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h4 className="font-semibold text-on-surface">{title}</h4>
      {children}
    </section>
  )
}

export function FsrsGuidePanel() {
  const [open, setOpen] = useState(false)

  return (
    <Card className="mb-8 overflow-hidden py-0 gap-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-surface-container-low transition-colors"
        aria-expanded={open}
        data-testid="fsrs-guide-toggle"
      >
        <div>
          <h3 className="font-semibold text-on-surface">
            How FSRS scheduling works
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Preview buttons, learning steps, and what you can change on this
            page.
          </p>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            'shrink-0 text-on-surface-variant transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-outline pt-6 text-sm text-on-surface-variant leading-relaxed">
          <GuideSection title="What FSRS tracks">
            <p>
              Each card has{' '}
              <strong className="font-medium text-on-surface">stability</strong>{' '}
              (how long memory lasts) and{' '}
              <strong className="font-medium text-on-surface">
                difficulty
              </strong>{' '}
              (how hard the material is). After every review, FSRS updates both
              and sets the next{' '}
              <strong className="font-medium text-on-surface">due</strong> date.
              CogCS uses the official{' '}
              <a
                href="https://github.com/open-spaced-repetition/go-fsrs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface underline underline-offset-2 hover:opacity-80"
              >
                go-fsrs
              </a>{' '}
              library — the same family of algorithms as Anki&apos;s FSRS.
            </p>
          </GuideSection>

          <GuideSection title="Preview buttons in study">
            <p>
              When you flip a card, each rating button shows when that card
              would come back if you pressed it — without saving yet. The app
              calls the same scheduler the API uses for real reviews, so
              previews match actual outcomes.
            </p>
          </GuideSection>

          <GuideSection title="Card states">
            <ul className="space-y-2">
              {CARD_STATES.map(({ state, meaning }) => (
                <li key={state}>
                  <span className="font-medium text-on-surface">{state}</span>
                  {' — '}
                  {meaning}
                </li>
              ))}
            </ul>
          </GuideSection>

          <GuideSection title="Why new cards show minute-scale previews">
            <p>
              Before day-scale intervals kick in, go-fsrs runs a short{' '}
              <strong className="font-medium text-on-surface">
                learning queue
              </strong>{' '}
              with default steps of{' '}
              <strong className="font-medium text-on-surface">1 minute</strong>{' '}
              and{' '}
              <strong className="font-medium text-on-surface">
                10 minutes
              </strong>
              . That is why a new card at 9:05 PM may show 9:06 / 9:11 / 9:15 —
              not +1 day / +3 days yet.
            </p>
            <div className="mt-3 overflow-x-auto rounded-md border border-outline">
              <table className="w-full min-w-[20rem] text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface">
                  <tr>
                    <th className="px-3 py-2 font-medium">Rating</th>
                    <th className="px-3 py-2 font-medium">
                      Typical preview (new card)
                    </th>
                    <th className="px-3 py-2 font-medium">What happens</th>
                  </tr>
                </thead>
                <tbody>
                  {NEW_CARD_PREVIEWS.map(({ rating, interval, note }) => (
                    <tr key={rating} className="border-t border-outline">
                      <td className="px-3 py-2 font-medium text-on-surface">
                        {rating}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums">
                        {interval}
                      </td>
                      <td className="px-3 py-2">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              After you complete the learning steps (usually by pressing Good
              until the queue is empty), the card graduates to{' '}
              <strong className="font-medium text-on-surface">review</strong>{' '}
              and future intervals are in days.
            </p>
          </GuideSection>

          <GuideSection title="First-review weights (w[0]–w[3])">
            <p>
              The four weights at the top of <em>Advanced algorithm weights</em>{' '}
              set initial stability when a card graduates from new/learning, or
              when you press Easy on a new card. Defaults are roughly 0.4 / 1.2
              / 3.2 / 15.7 days for Again / Hard / Good / Easy.
            </p>
          </GuideSection>

          <GuideSection title="After a lapse">
            <p>
              Pressing{' '}
              <strong className="font-medium text-on-surface">Again</strong> on
              a review card moves it to{' '}
              <strong className="font-medium text-on-surface">
                relearning
              </strong>
              . The default relearning step is{' '}
              <strong className="font-medium text-on-surface">
                10 minutes
              </strong>{' '}
              before day-scale scheduling resumes.
            </p>
          </GuideSection>

          <GuideSection title="What you can change here">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="font-medium text-on-surface">
                  Desired retention
                </strong>{' '}
                — target recall probability (default 90%). Higher values mean
                more frequent reviews.
              </li>
              <li>
                <strong className="font-medium text-on-surface">
                  FSRS weights
                </strong>{' '}
                — including the four first-review intervals. Most users should
                keep advanced weights at defaults unless they have a specific
                reason to change them.
              </li>
              <li>
                <strong className="font-medium text-on-surface">
                  Optimization
                </strong>{' '}
                — trains weights from your review history once you have enough
                data.
              </li>
            </ul>
            <p className="mt-2">
              Learning steps and relearning steps follow go-fsrs defaults and
              are not configurable in the UI yet. Settings on this page apply to
              all your decks.
            </p>
          </GuideSection>
        </div>
      )}
    </Card>
  )
}
