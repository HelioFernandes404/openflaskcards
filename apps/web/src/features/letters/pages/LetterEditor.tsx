import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Label } from '@/shared/components/label'
import { Card, CardContent } from '@/shared/components/card'
import { PageHeader } from '@/shared/layout/PageHeader'
import { useLetters } from '../hooks/useLetters'
import { LetterLyricsEditor } from '../components/LetterLyricsEditor'
import { LetterLineStats } from '../components/LetterLineStats'
import { getLyricsLineStats } from '../domain/alignLyricsLines'

export function LetterEditor() {
  const navigate = useNavigate()
  const { letterId } = useParams({ strict: false })
  const isEditing = Boolean(letterId)
  const { decks, studyService } = useStudyData()
  const { showToast } = useNotification()
  const { createLetter, updateLetter } = useLetters()

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [originalLyrics, setOriginalLyrics] = useState('')
  const [translation, setTranslation] = useState('')
  const [deckId, setDeckId] = useState<string>('')
  const [loadingLetter, setLoadingLetter] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  const lineStats = useMemo(
    () => getLyricsLineStats(originalLyrics, translation),
    [originalLyrics, translation],
  )

  useEffect(() => {
    if (!letterId) return
    let cancelled = false
    setLoadingLetter(true)
    studyService
      .getLetter(letterId)
      .then((letter) => {
        if (cancelled) return
        setTitle(letter.title)
        setArtist(letter.artist)
        setOriginalLyrics(letter.originalLyrics)
        setTranslation(letter.translation)
        setDeckId(letter.deckId ?? '')
      })
      .catch((err) => {
        if (cancelled) return
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'Failed to load letter.',
          }),
          'error',
        )
        navigate({ to: '/letters' })
      })
      .finally(() => {
        if (!cancelled) setLoadingLetter(false)
      })
    return () => {
      cancelled = true
    }
  }, [letterId, studyService, showToast, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        artist: artist.trim(),
        originalLyrics,
        translation,
        deckId: deckId || null,
      }
      if (letterId) {
        const updated = await updateLetter(letterId, payload)
        if (updated)
          navigate({
            to: '/letters/$letterId',
            params: { letterId: updated.id },
          })
      } else {
        const created = await createLetter(payload)
        if (created)
          navigate({
            to: '/letters/$letterId',
            params: { letterId: created.id },
          })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="letter-editor-page"
    >
      <PageHeader
        title={isEditing ? 'Edit Letter' : 'New Letter'}
        subtitle="Paste lyrics side by side — matching line breaks keeps the read view aligned"
        backTo={isEditing && letterId ? `/letters/${letterId}` : '/letters'}
      />

      <Card>
        <CardContent className="p-6 sm:p-8">
          {loadingLetter ? (
            <p className="text-sm text-on-surface-variant">Loading...</p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
              data-testid="letter-editor-form"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="letter-title" className="block mb-2">
                    Song title
                  </Label>
                  <Input
                    id="letter-title"
                    data-testid="letter-title-input"
                    type="text"
                    placeholder="e.g. Breaking The Habit"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="letter-artist" className="block mb-2">
                    Artist
                  </Label>
                  <Input
                    id="letter-artist"
                    data-testid="letter-artist-input"
                    type="text"
                    placeholder="e.g. Linkin Park"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <LetterLyricsEditor
                  originalLyrics={originalLyrics}
                  translation={translation}
                  onOriginalChange={setOriginalLyrics}
                  onTranslationChange={setTranslation}
                />
                <LetterLineStats stats={lineStats} />
              </div>

              <div>
                <Label htmlFor="letter-deck" className="block mb-2">
                  Linked deck (vocabulary)
                </Label>
                <select
                  id="letter-deck"
                  data-testid="letter-deck-select"
                  className="w-full rounded-md border border-outline bg-surface-container-low px-3 py-2 text-sm text-on-surface"
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                >
                  <option value="">No deck linked</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Optional. Flashcards in this deck are separate from the lyrics
                  above.
                </p>
              </div>

              <Button
                type="submit"
                className="gap-2 self-start"
                disabled={saving || !title.trim()}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save letter'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
