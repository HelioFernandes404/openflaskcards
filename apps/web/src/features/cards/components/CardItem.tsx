import { useState } from 'react'
import { Edit, Trash2, MoreVertical } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/card'
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage'

interface CardItemProps {
  id: string
  front: string
  back: string
  fonetica?: string
  imagemUrl?: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function CardItem({
  id,
  front,
  back,
  fonetica,
  imagemUrl,
  onEdit,
  onDelete,
}: CardItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <Card
      className="relative group hover:border-outline-strong transition-colors"
      data-testid={`card-item-${id}`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {imagemUrl && (
              <AuthenticatedImage
                src={imagemUrl}
                alt={front}
                className="mb-3 w-full max-h-40 rounded-md border border-outline object-cover bg-surface-container"
              />
            )}

            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs font-bold uppercase opacity-40 shrink-0">
                Word:
              </span>
              <p className="font-bold text-sm line-clamp-2 break-words">
                {front}
              </p>
            </div>

            {showAnswer ? (
              <div className="flex flex-col gap-2 bg-surface-container-low p-2 rounded-md border border-outline">
                {fonetica && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold uppercase opacity-40 shrink-0">
                      Pron:
                    </span>
                    <p className="text-sm font-mono text-on-surface">
                      {fonetica}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold uppercase opacity-40 shrink-0">
                    Mean:
                  </span>
                  <p className="text-sm opacity-80 line-clamp-3 break-words">
                    {back}
                  </p>
                </div>
              </div>
            ) : (
              <button
                data-testid={`card-item-show-answer-button-${id}`}
                onClick={() => setShowAnswer(true)}
                className="text-xs font-bold uppercase opacity-50 hover:opacity-100 transition-opacity"
              >
                Show Answer →
              </button>
            )}
          </div>

          {(onEdit || onDelete) && (
            <div className="relative shrink-0">
              <button
                data-testid={`card-item-menu-button-${id}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface-container-high rounded-md"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(!menuOpen)
                }}
              >
                <MoreVertical size={18} strokeWidth={1.5} />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                    }}
                  />
                  <div className="absolute right-0 top-8 z-20 bg-surface-container-high border border-outline-strong rounded-md overflow-hidden min-w-[120px]">
                    {onEdit && (
                      <button
                        data-testid={`card-item-edit-button-${id}`}
                        className="w-full px-3 py-2 text-left hover:bg-surface-container flex items-center gap-2 text-sm font-semibold"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(false)
                          onEdit(id)
                        }}
                      >
                        <Edit size={14} strokeWidth={1.5} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        data-testid={`card-item-delete-button-${id}`}
                        className="w-full px-3 py-2 text-left hover:bg-danger-50 flex items-center gap-2 text-sm font-semibold text-danger-800"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(false)
                          onDelete(id)
                        }}
                      >
                        <Trash2 size={14} strokeWidth={1.5} /> Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
