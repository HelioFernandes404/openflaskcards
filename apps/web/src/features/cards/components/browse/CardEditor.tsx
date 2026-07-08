import { useEffect, useRef, useState } from 'react'
import {
  Eye,
  Loader2,
  MousePointerClick,
  Check,
  AlertCircle,
  Trash2,
  Plus,
  Volume2,
  ImagePlus,
  ChevronDown,
} from 'lucide-react'
import type { Card } from '../../types/card'
import { ImageUploader } from '../ImageUploader'
import { CardPreviewModal } from './CardPreviewModal'
import { AutoResizeTextarea } from '@/shared/components/auto-resize-textarea'
import { Badge } from '@/shared/components/badge'
import { Button } from '@/shared/components/button'
import { EmptyState } from '@/shared/components/empty-state'
import { Switch } from '@/shared/components/switch'
import { cn } from '@/shared/utils'

function SaveStatus({
  saveError,
  isSaving,
  isDirty,
  lastSavedAt,
}: {
  saveError: string | null
  isSaving: boolean
  isDirty: boolean
  lastSavedAt: Date | null
}) {
  if (saveError) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger-800">
        <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" />
        Error
      </span>
    )
  }

  if (isSaving) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant">
        <Loader2
          className="animate-spin"
          size={12}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        Saving…
      </span>
    )
  }

  if (isDirty) {
    return <span className="text-xs text-on-surface-variant">Unsaved</span>
  }

  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success-800">
        <Check size={12} strokeWidth={1.5} aria-hidden="true" />
        Saved
      </span>
    )
  }

  return null
}

function FieldBlock({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-heading uppercase tracking-wide text-on-surface-variant"
        >
          {label}
        </label>
        {hint ? (
          <span className="text-[10px] text-on-surface-variant/70">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

interface CardEditorProps {
  card: Card | null
  frontText: string
  backText: string
  imagemUrl: string | undefined
  cardTags: string
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  lastSavedAt: Date | null
  getDeckName: (deckId: string) => string
  getCardStateLabel: (state: Card['state']) => string
  onFrontTextChange: (text: string) => void
  onBackTextChange: (text: string) => void
  onImagemUrlChange: (url: string | undefined) => void
  onCardTagsChange: (tags: string) => void
  ttsEnabled: boolean
  onTtsEnabledChange: (enabled: boolean) => void
  onDeleteRequest?: () => void
  isDeleting?: boolean
  onQuickCreate?: () => void
  canQuickCreate?: boolean
  isCreating?: boolean
}

export function CardEditor({
  card,
  frontText,
  backText,
  imagemUrl,
  cardTags: _cardTags,
  isDirty,
  isSaving,
  saveError,
  lastSavedAt,
  getDeckName,
  getCardStateLabel,
  onFrontTextChange,
  onBackTextChange,
  onImagemUrlChange,
  onCardTagsChange: _onCardTagsChange,
  ttsEnabled,
  onTtsEnabledChange,
  onDeleteRequest,
  isDeleting = false,
  onQuickCreate,
  canQuickCreate = false,
  isCreating = false,
}: CardEditorProps) {
  const backFieldRef = useRef<HTMLTextAreaElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [studyOptionsOpen, setStudyOptionsOpen] = useState(false)

  const hasImage = Boolean(imagemUrl)
  const studyOptionsActive = ttsEnabled || hasImage

  useEffect(() => {
    setPreviewOpen(false)
    setStudyOptionsOpen(Boolean(card?.imagemUrl) || Boolean(card?.ttsEnabled))
  }, [card?.id, card?.imagemUrl, card?.ttsEnabled])

  const stateVariant =
    card?.state === 'new'
      ? 'outlined'
      : card?.state === 'review'
        ? 'default'
        : 'neutral'

  const focusBackField = () => {
    backFieldRef.current?.focus()
  }

  return (
    <>
      <aside className="flex h-full w-[450px] shrink-0 flex-col border-l-2 border-outline bg-surface-container-low">
        <div className="flex items-center justify-between gap-3 border-b-2 border-outline px-4 py-3">
          <div className="min-w-0">
            {card ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stateVariant} className="uppercase">
                  {getCardStateLabel(card.state)}
                </Badge>
                <span className="truncate text-sm text-on-surface">
                  {getDeckName(card.deckId)}
                </span>
              </div>
            ) : (
              <p className="text-sm font-medium text-on-surface">Card editor</p>
            )}
            <div className="mt-1 h-4">
              <SaveStatus
                saveError={saveError}
                isSaving={isSaving}
                isDirty={isDirty}
                lastSavedAt={lastSavedAt}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={
                !onQuickCreate || !canQuickCreate || isCreating || isSaving
              }
              onClick={onQuickCreate}
              title={
                canQuickCreate
                  ? 'Add new card to current deck'
                  : 'Create a deck first'
              }
              data-testid="card-editor-quick-create-button"
              aria-label="Add card"
              className={cn(
                'size-8',
                onQuickCreate && canQuickCreate && !isCreating && !isSaving
                  ? 'cursor-pointer'
                  : 'cursor-not-allowed opacity-50',
              )}
            >
              {isCreating ? (
                <Loader2 className="animate-spin" size={14} strokeWidth={1.5} />
              ) : (
                <Plus size={14} strokeWidth={1.5} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!card}
              onClick={() => setPreviewOpen(true)}
              title="Preview study card"
              aria-label="Preview card"
              className={cn(
                'size-8',
                card ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              )}
            >
              <Eye size={14} strokeWidth={1.5} />
            </Button>
            {onDeleteRequest ? (
              <Button
                variant="ghost"
                size="icon"
                disabled={!card || isSaving || isDeleting}
                onClick={onDeleteRequest}
                title="Delete card"
                aria-label="Delete card"
                data-testid="card-editor-delete-button"
                className={cn(
                  'size-8 text-danger-800 hover:bg-danger-50',
                  (!card || isSaving || isDeleting) &&
                    'cursor-not-allowed opacity-50',
                )}
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
          </div>
        </div>

        {saveError ? (
          <div className="border-b border-danger-200 bg-danger-50 px-4 py-2 text-xs text-danger-800">
            {saveError}
          </div>
        ) : null}

        {card ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <FieldBlock
                id="card-editor-front"
                label="Front"
                hint="Shown first"
              >
                <AutoResizeTextarea
                  id="card-editor-front"
                  value={frontText}
                  onChange={(e) => onFrontTextChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      focusBackField()
                    }
                  }}
                  placeholder="Word or phrase on the front"
                  maxRows={8}
                  className="min-h-[108px] bg-surface"
                />
              </FieldBlock>

              <FieldBlock
                id="card-editor-back"
                label="Back"
                hint="Revealed on flip"
              >
                <AutoResizeTextarea
                  ref={backFieldRef}
                  id="card-editor-back"
                  value={backText}
                  onChange={(e) => onBackTextChange(e.target.value)}
                  placeholder="Translation or definition"
                  maxRows={10}
                  className="min-h-[108px] bg-surface"
                />
              </FieldBlock>

              <div className="border-t border-outline pt-3">
                <button
                  type="button"
                  onClick={() => setStudyOptionsOpen((open) => !open)}
                  aria-expanded={studyOptionsOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-base px-1 py-1.5 text-left transition-colors hover:bg-surface-container"
                >
                  <span className="text-xs font-heading uppercase tracking-wide text-on-surface-variant">
                    Study options
                  </span>
                  <span className="flex items-center gap-2">
                    {studyOptionsActive && !studyOptionsOpen ? (
                      <span className="text-[10px] text-on-surface-variant/70">
                        Active
                      </span>
                    ) : null}
                    <ChevronDown
                      size={14}
                      strokeWidth={1.5}
                      className={cn(
                        'text-on-surface-variant transition-transform duration-150',
                        studyOptionsOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </span>
                </button>

                {studyOptionsOpen ? (
                  <div className="mt-2 space-y-3 rounded-base border border-outline bg-surface-container-lowest p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <Volume2
                          size={14}
                          strokeWidth={1.5}
                          className="mt-0.5 shrink-0 text-on-surface-variant"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-on-surface">
                            Pronunciation (TTS)
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            Audio from front text during study
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={ttsEnabled}
                        onCheckedChange={onTtsEnabledChange}
                        disabled={isSaving}
                        aria-label={`${ttsEnabled ? 'Disable' : 'Enable'} TTS for this card`}
                        data-testid="card-editor-tts-toggle"
                      />
                    </div>

                    <div className="space-y-2 border-t border-outline pt-3">
                      <div className="flex items-center gap-2">
                        <ImagePlus
                          size={14}
                          strokeWidth={1.5}
                          className="text-on-surface-variant"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-on-surface">
                            Context image
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            Shown on the front
                          </p>
                        </div>
                      </div>
                      <ImageUploader
                        value={imagemUrl}
                        onChange={onImagemUrlChange}
                        disabled={isSaving}
                        compact={hasImage}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-outline px-4 py-2">
              <p className="text-[10px] text-on-surface-variant/70">
                Changes save automatically · Ctrl+Enter in Front jumps to Back
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full rounded-xl border border-dashed border-outline bg-surface-container-lowest">
              <EmptyState
                title="No card selected"
                hint="Choose a card from the list to view and edit its fields."
                action={
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <MousePointerClick
                      size={14}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Click a row in the table
                  </div>
                }
              />
            </div>
          </div>
        )}
      </aside>

      {card ? (
        <CardPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          card={card}
          frontText={frontText}
          backText={backText}
          imagemUrl={imagemUrl}
          isDirty={isDirty}
        />
      ) : null}
    </>
  )
}
