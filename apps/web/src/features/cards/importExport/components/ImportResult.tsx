import type {
  ImportResult as ImportResultType,
  ParsedCsvRow,
} from '../types/importExport'
import { generateErrorCsv, downloadCsv } from '../utils/csvExport'

interface ImportResultProps {
  result: ImportResultType
  rows: ParsedCsvRow[]
  onClose: () => void
}

export function ImportResult({ result, rows, onClose }: ImportResultProps) {
  const hasErrors = result.failed > 0

  const handleDownloadErrors = () => {
    // Build error CSV with original row data
    const errorRows = result.errors.map((error) => {
      const originalRow = rows.find((r) => r._rowIndex === error.index + 2) // +2 for header and 0-index
      return {
        line: error.index + 2,
        front: originalRow?.front || '',
        back: originalRow?.back || '',
        error: error.message,
      }
    })

    const csvContent = generateErrorCsv(errorRows)
    downloadCsv(csvContent, 'import-errors.csv')
  }

  return (
    <div className="space-y-4">
      {/* Success/partial success banner */}
      <div
        className={`rounded-lg p-4 ${
          hasErrors
            ? 'bg-surface-container border border-outline-strong'
            : 'bg-success-50 border border-success-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {hasErrors ? (
            <svg
              className="w-6 h-6 text-on-surface flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-success-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <div>
            <h3
              className={`font-medium ${hasErrors ? 'text-on-surface' : 'text-success-800'}`}
            >
              {hasErrors
                ? 'Import Completed with Errors'
                : 'Import Completed Successfully!'}
            </h3>
            <div className="mt-2 text-sm space-y-1">
              <p
                className={
                  hasErrors ? 'text-on-surface-variant' : 'text-success-800'
                }
              >
                <span className="font-medium">{result.created}</span> cards
                created successfully
              </p>
              {result.failed > 0 && (
                <p className="text-danger-800">
                  <span className="font-medium">{result.failed}</span> cards
                  failed
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error details */}
      {hasErrors && result.errors.length > 0 && (
        <div className="border border-outline rounded-lg overflow-hidden">
          <div className="bg-surface-container-low px-4 py-2 border-b border-outline flex items-center justify-between">
            <h4 className="font-medium text-neutral-900">
              Errors ({result.errors.length})
            </h4>
            <button
              onClick={handleDownloadErrors}
              className="text-sm text-on-surface hover:underline"
            >
              Download Error CSV
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-surface-container-low sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                    Line
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                    Field
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-neutral-0 divide-y divide-white/10">
                {result.errors.slice(0, 20).map((error, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-neutral-900">
                      {error.index + 2}
                    </td>
                    <td className="px-4 py-2 text-sm text-neutral-500">
                      {error.field || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-danger-800">
                      {error.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.errors.length > 20 && (
              <div className="px-4 py-2 text-sm text-neutral-500 bg-surface-container-low">
                ... and {result.errors.length - 20} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary-500 text-neutral-0 rounded-md hover:bg-primary-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
