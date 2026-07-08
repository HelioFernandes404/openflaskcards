import { useState, useCallback } from 'react'
import { Plus, Upload, Copy, Check, ImagePlus } from 'lucide-react'
import { useParams, Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/layout/PageHeader'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { Button } from '@/shared/components/button'
import { AutoResizeTextarea } from '@/shared/components/auto-resize-textarea'
import { Input } from '@/shared/components/input'
import { Select } from '@/shared/components/select'
import { Label } from '@/shared/components/label'
import { Card, CardContent } from '@/shared/components/card'
import { Spinner } from '@/shared/components/spinner'
import { ImageUploader } from '../components/ImageUploader'
import { CREATE_CARD_ASSISTANT_PROMPT } from '../constants/createCardAssistantPrompt'

const formLabelClass =
  'mb-2 block font-mono text-xs font-medium uppercase tracking-wider text-on-surface-variant'

export function AddCards() {
  const { deckId } = useParams({ strict: false })
  const { decks, handleAddCard, loading } = useStudyData()
  const { showToast } = useNotification()

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [fonetica, setFonetica] = useState('')
  const [selectedDeckId, setSelectedDeckId] = useState(
    deckId || decks[0]?.id || '',
  )
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(undefined)
  const [showImage, setShowImage] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const activeDeck = decks.find((d) => d.id === selectedDeckId)
  const deckLocked = Boolean(deckId)

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CREATE_CARD_ASSISTANT_PROMPT)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    } catch {
      showToast('Failed to copy prompt')
    }
  }, [showToast])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return

    await handleAddCard({
      deckId: selectedDeckId,
      front: front.trim(),
      back: back.trim(),
      fonetica: fonetica.trim() || undefined,
      imagemUrl,
    })
    showToast('Card added')
    setFront('')
    setBack('')
    setFonetica('')
    setImagemUrl(undefined)
    setShowImage(false)
  }

  const canSubmit = !loading.addCard && front.trim() && back.trim()

  return (
    <div
      className="flex h-[calc(100dvh-5.5rem)] min-h-0 flex-col md:h-[calc(100dvh-7rem)]"
      data-testid="add-cards-page"
    >
      <PageHeader
        className="mb-4 shrink-0"
        title={activeDeck ? `Add to ${activeDeck.name}` : 'Add Cards'}
        backTo="/"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyPrompt}
              data-testid="add-cards-copy-prompt-button"
            >
              {promptCopied ? (
                <Check strokeWidth={1.5} />
              ) : (
                <Copy strokeWidth={1.5} />
              )}
              {promptCopied ? 'Copied' : 'Prompt'}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/decks/$deckId/cards/import"
                params={{ deckId: selectedDeckId }}
                data-testid="add-cards-import-link"
              >
                <Upload strokeWidth={1.5} />
                Import
              </Link>
            </Button>
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 justify-center">
        <section className="flex w-full max-w-[400px] flex-col">
          <Card className="gap-0 border-outline-variant bg-surface-container-low py-0">
            <CardContent className="p-6">
              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {!deckLocked && (
                    <div className="sm:col-span-2">
                      <Label htmlFor="deck-select" className={formLabelClass}>
                        Deck
                      </Label>
                      <Select
                        id="deck-select"
                        data-testid="add-cards-deck-select"
                        className="cursor-pointer"
                        value={selectedDeckId}
                        onChange={(e) => setSelectedDeckId(e.target.value)}
                      >
                        {decks.map((deck) => (
                          <option key={deck.id} value={deck.id}>
                            {deck.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {deckLocked && (
                    <select
                      data-testid="add-cards-deck-select"
                      aria-hidden
                      tabIndex={-1}
                      className="sr-only"
                      value={selectedDeckId}
                      disabled
                    >
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <Label htmlFor="front" className={formLabelClass}>
                    English
                  </Label>
                  <AutoResizeTextarea
                    id="front"
                    data-testid="add-cards-word-input"
                    placeholder="Word or phrase"
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fonetica" className={formLabelClass}>
                    Pronunciation
                  </Label>
                  <Input
                    id="fonetica"
                    data-testid="add-cards-pronunciation-input"
                    placeholder="Optional — e.g. /ske-dju-ler/"
                    value={fonetica}
                    onChange={(e) => setFonetica(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="back" className={formLabelClass}>
                    Portuguese
                  </Label>
                  <AutoResizeTextarea
                    id="back"
                    data-testid="add-cards-meaning-input"
                    placeholder="Meaning or translation"
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                  />
                </div>

                {showImage && (
                  <div>
                    <span className={formLabelClass}>Image</span>
                    <ImageUploader
                      compact
                      value={imagemUrl}
                      onChange={setImagemUrl}
                      onError={showToast}
                      disabled={loading.addCard}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant={showImage || imagemUrl ? 'neutral' : 'ghost'}
                    size="icon"
                    title="Add image"
                    aria-pressed={showImage || Boolean(imagemUrl)}
                    onClick={() => setShowImage((v) => !v)}
                  >
                    <ImagePlus strokeWidth={1.5} />
                  </Button>
                  <Button
                    type="submit"
                    data-testid="add-cards-submit-button"
                    className="flex-1"
                    disabled={!canSubmit}
                  >
                    {loading.addCard ? (
                      <>
                        <Spinner size="sm" />
                        Adding…
                      </>
                    ) : (
                      <>
                        <Plus strokeWidth={1.5} />
                        Add Card
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>

      <div data-testid="add-cards-list" className="sr-only" aria-hidden />
    </div>
  )
}
