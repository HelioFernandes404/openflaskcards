import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Spinner } from '@/shared/components/spinner'
import { useErrorToast } from '@/shared/hooks/useErrorToast'
import { useEffect, useState } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import {
  CsvUploader,
  CsvPreviewTable,
  CsvColumnMapper,
  ImportOptions,
  ImportProgress,
  ImportResult,
  ExportButton,
  CopyPromptButton,
} from './components'
import {
  useCsvParser,
  useDeckCardsImport,
  useDeckCardsExport,
  PREVIEW_LIMIT,
} from './hooks'

export function ImportExportPage() {
  const { deckId } = useParams({ strict: false })
  const navigate = useNavigate()
  const { decks, refreshDecks } = useStudyData()
  const { showToast } = useNotification()

  const deck = decks.find((d) => d.id === deckId)
  const deckCardCount = deck?.totalCards ?? 0

  const {
    parsing,
    error: parseError,
    parseFile,
    reset: resetParser,
  } = useCsvParser()
  const {
    state: importState,
    setOptions,
    processFile,
    setColumnMapping,
    confirmMapping,
    startImport,
    reset: resetImport,
  } = useDeckCardsImport()
  const { exporting, error: exportError, exportCards } = useDeckCardsExport()

  const [showImportSection, setShowImportSection] = useState(true)

  const handleFileSelect = async (file: File) => {
    const result = await parseFile(file)
    if (result) {
      processFile(result)
    }
  }

  const handleStartImport = async () => {
    if (!deckId) return
    await startImport(deckId)
  }

  const handleImportClose = () => {
    resetParser()
    resetImport()
    refreshDecks()
    showToast('Cards imported successfully!', 'success')
  }

  const handleExport = async () => {
    if (!deckId || !deck) return
    await exportCards(deckId, deck.name)
    if (!exportError) {
      showToast('Cards exported successfully!', 'success')
    }
  }

  const handleReset = () => {
    resetParser()
    resetImport()
  }

  useErrorToast([parseError, exportError, importState.error], showToast)

  useEffect(() => {
    if (decks.length > 0 && !deck) navigate({ to: '/' })
  }, [decks, deck, navigate])

  if (!deck) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add cards to deck" subtitle={deck.name} backTo="/" />

      {/* Import Section */}
      <section className="bg-surface-container rounded-xl border border-outline p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowImportSection(!showImportSection)}
        >
          <h2 className="text-lg font-semibold text-on-surface">Import CSV</h2>
          <svg
            className={`w-5 h-5 text-on-surface-variant transition-transform ${showImportSection ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        <div className="mt-4 pt-4 border-t border-outline-variant">
          <p className="text-sm text-on-surface-variant mb-2">
            Want to generate a CSV with AI?
          </p>
          <CopyPromptButton
            onSuccess={() => showToast('Prompt copied!', 'success')}
            onError={() => showToast('Error copying prompt!', 'error')}
          />
        </div>

        {showImportSection && (
          <div className="mt-4 space-y-4">
            {importState.status === 'idle' && (
              <CsvUploader
                onFileSelect={handleFileSelect}
                disabled={parsing}
                parsing={parsing}
              />
            )}

            {importState.status === 'mapping' &&
              importState.parseResult &&
              importState.columnMapping && (
                <div className="space-y-4">
                  <CsvColumnMapper
                    headers={importState.parseResult.headers}
                    mapping={importState.columnMapping}
                    onMappingChange={setColumnMapping}
                    onConfirm={confirmMapping}
                    error={importState.error}
                  />
                  <button
                    onClick={handleReset}
                    className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Cancel and choose another file
                  </button>
                </div>
              )}

            {importState.status === 'preview' &&
              importState.parseResult &&
              importState.validationResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-success-600" />
                      <span className="text-on-surface-variant">
                        {`${importState.validationResult.validRows.length} valid rows`}
                      </span>
                    </div>
                    {importState.validationResult.invalidRows.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-danger-800" />
                        <span className="text-on-surface-variant">
                          {`${importState.validationResult.invalidRows.length} rows with errors`}
                        </span>
                      </div>
                    )}
                    {importState.validationResult.duplicateCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-info-600" />
                        <span className="text-on-surface-variant">
                          {`${importState.validationResult.duplicateCount} duplicates ignored`}
                        </span>
                      </div>
                    )}
                  </div>

                  <CsvPreviewTable
                    rows={importState.parseResult.rows}
                    errors={importState.validationResult.errors}
                    maxRows={PREVIEW_LIMIT}
                    totalRows={importState.parseResult.totalRows}
                  />

                  <ImportOptions
                    options={importState.options}
                    onChange={setOptions}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleStartImport}
                      disabled={
                        importState.validationResult.validRows.length === 0
                      }
                      className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                        importState.validationResult.validRows.length > 0
                          ? 'bg-primary text-on-primary hover:bg-primary-hover'
                          : 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-50'
                      }`}
                    >
                      {`Import ${importState.validationResult.validRows.length} cards`}
                    </button>
                    <button
                      onClick={handleReset}
                      className="py-2 px-4 rounded-md font-medium border border-outline text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            {importState.status === 'importing' &&
              importState.importProgress && (
                <ImportProgress
                  current={importState.importProgress.current}
                  total={importState.importProgress.total}
                />
              )}

            {importState.status === 'complete' &&
              importState.importResult &&
              importState.parseResult && (
                <ImportResult
                  result={importState.importResult}
                  rows={importState.parseResult.rows}
                  onClose={handleImportClose}
                />
              )}

            {importState.status === 'error' && (
              <div className="space-y-4">
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                  <p className="text-danger-800">{importState.error}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-on-surface-variant hover:text-on-surface underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Export Section */}
      <section className="bg-surface-container-low rounded-xl border border-outline p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          Export CSV
        </h2>
        <ExportButton
          onExport={handleExport}
          exporting={exporting}
          cardCount={deckCardCount}
        />
        {exportError && (
          <p className="mt-2 text-sm text-danger-800">{exportError}</p>
        )}
      </section>

      {/* Quick add link */}
      <div className="text-center">
        <Link
          to="/decks/$deckId/cards/add"
          params={{ deckId: deck.id }}
          className="text-on-surface-variant hover:text-on-surface underline"
        >
          Or add cards manually
        </Link>
      </div>
    </div>
  )
}
