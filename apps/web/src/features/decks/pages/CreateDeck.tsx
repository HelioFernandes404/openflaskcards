import { useState } from 'react'
import { Save } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Textarea } from '@/shared/components/textarea'
import { Label } from '@/shared/components/label'
import { Card, CardContent } from '@/shared/components/card'
import { PageHeader } from '@/shared/layout/PageHeader'
import { DeckTableRow } from '../components/DeckTableRow'
import { DeckModuleSelect } from '@/features/modules/components/DeckModuleSelect'

export function CreateDeck() {
  const navigate = useNavigate()
  const { handleCreateDeck, modules, loading } = useStudyData()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [newCardsDailyLimit, setNewCardsDailyLimit] = useState(10)
  const [moduleId, setModuleId] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    handleCreateDeck(
      { name, description, newCardsDailyLimit, moduleId },
      (deckId) => {
        navigate({ to: '/decks/$deckId/cards/add', params: { deckId } })
      },
    )
  }

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setNewCardsDailyLimit(Math.max(0, Math.min(200, value)))
    }
  }

  return (
    <div
      className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="create-deck-page"
    >
      <PageHeader
        title="Create New Deck"
        subtitle="Design your new study collection"
        backTo="/"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <Card className="order-2 lg:order-1">
          <CardContent className="p-8">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
              data-testid="create-deck-form"
            >
              <div>
                <Label htmlFor="name" className="block mb-2">
                  Deck Title
                </Label>
                <Input
                  id="name"
                  data-testid="create-deck-name-input"
                  type="text"
                  className="text-xl"
                  placeholder="e.g. Advanced Calculus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="description" className="block mb-2">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  data-testid="create-deck-description-input"
                  className="min-h-[120px]"
                  placeholder="What is this deck about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="newCardsDailyLimit" className="block mb-2">
                  New Cards Per Day
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="newCardsDailyLimit"
                    data-testid="create-deck-daily-limit-input"
                    type="number"
                    min={0}
                    max={200}
                    className="w-24 text-center text-xl"
                    value={newCardsDailyLimit}
                    onChange={handleLimitChange}
                  />
                  <span className="text-sm opacity-60">cards/day (0-200)</span>
                </div>
                <p className="text-xs opacity-50 mt-1">
                  Limits how many new cards you can study each day in this deck.
                </p>
              </div>

              <DeckModuleSelect
                id="create-deck-module"
                modules={modules}
                value={moduleId}
                onChange={setModuleId}
                disabled={loading.createDeck}
              />

              <div className="flex gap-4 pt-4 mt-auto">
                <Button
                  type="button"
                  variant="neutral"
                  data-testid="create-deck-cancel-button"
                  className="flex-1 py-3 text-lg"
                  onClick={() => navigate({ to: '/' })}
                  disabled={loading.createDeck}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="create-deck-submit-button"
                  className="flex-[2] py-3 text-lg gap-2"
                  disabled={loading.createDeck || !name.trim()}
                >
                  <Save size={20} />{' '}
                  {loading.createDeck ? 'Creating...' : 'Create Deck'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="flex flex-col gap-4 order-1 lg:order-2">
          <h3 className="text-sm font-medium text-on-surface-variant text-center lg:text-left">
            Preview
          </h3>
          <div className="opacity-50 pointer-events-none transform scale-95 lg:scale-100 origin-top rounded-xl border border-outline-subtle bg-surface-container-low overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-surface-container-lowest border-b border-outline-subtle">
                <tr>
                  <th className="px-4 py-2 text-left font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                    Deck
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium">
                    Due
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-2xs uppercase tracking-wider text-muted font-medium" />
                </tr>
              </thead>
              <tbody>
                <DeckTableRow
                  id="preview"
                  name={name || 'Untitled Deck'}
                  newCount={0}
                  learnCount={0}
                  reviewCount={0}
                  lastReviewed="Never"
                  accentColor="var(--color-primary-500)"
                  onStart={() => {}}
                  onAddCards={() => {}}
                />
              </tbody>
            </table>
          </div>
          <p className="text-center lg:text-left text-xs opacity-50 font-medium max-w-sm">
            This is how your deck will appear on the dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
