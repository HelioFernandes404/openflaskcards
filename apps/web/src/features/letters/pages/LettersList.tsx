import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { SkeletonCard } from '@/shared/components/skeleton'
import { LetterCard } from '../components/LetterCard'
import { useLetters } from '../hooks/useLetters'

export function LettersList() {
  const navigate = useNavigate()
  const { decks } = useStudyData()
  const { letters, loading } = useLetters()

  const deckNameById = useMemo(
    () => new Map(decks.map((deck) => [deck.id, deck.name])),
    [decks],
  )

  return (
    <div
      className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="letters-list-page"
    >
      <PageHeader
        title="Letters"
        subtitle="Song lyrics in English and Portuguese — decks are only for vocabulary"
        backTo="/"
        actions={
          <Button
            className="gap-2"
            onClick={() => navigate({ to: '/letters/create' })}
          >
            <Plus size={16} />
            New letter
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : letters.length === 0 ? (
        <EmptyState
          title="No letters yet"
          hint="Create a letter with the full lyrics and translation, then link a deck for flashcards."
          action={
            <Button
              className="gap-2"
              onClick={() => navigate({ to: '/letters/create' })}
            >
              <Plus size={16} />
              New letter
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {letters.map((letter) => (
            <LetterCard
              key={letter.id}
              letter={letter}
              deckName={
                letter.deckId ? deckNameById.get(letter.deckId) : undefined
              }
              onOpen={(id) =>
                navigate({ to: '/letters/$letterId', params: { letterId: id } })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
