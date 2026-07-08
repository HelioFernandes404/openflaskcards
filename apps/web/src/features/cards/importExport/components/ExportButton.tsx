import { Spinner } from '@/shared/components/spinner'

interface ExportButtonProps {
  onExport: () => void
  exporting: boolean
  cardCount?: number
}

export function ExportButton({
  onExport,
  exporting,
  cardCount,
}: ExportButtonProps) {
  return (
    <button
      onClick={onExport}
      disabled={exporting || cardCount === 0}
      className={`
        w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors
        ${
          exporting || cardCount === 0
            ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            : 'bg-success-600 text-neutral-0 hover:bg-success-800'
        }
      `}
    >
      {exporting ? (
        <>
          <Spinner size="sm" className="border-current/30 border-t-current" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>
            {cardCount !== undefined
              ? `Export ${cardCount} cards to CSV`
              : 'Export cards to CSV'}
          </span>
        </>
      )}
    </button>
  )
}
