import { useState, useCallback } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import type {
  ImportState,
  ImportOptions,
  CsvParseResult,
  ColumnMapping,
  ImportResult,
  ParsedCsvRow,
  BulkCardItem,
} from '../types/importExport'
import { DEFAULT_IMPORT_OPTIONS } from '../types/importExport'
import {
  suggestColumnMapping,
  applyColumnMapping,
  validateRows,
} from '../utils/csvValidation'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'

const CHUNK_SIZE = 500

interface UseDeckCardsImportReturn {
  state: ImportState
  setOptions: (options: Partial<ImportOptions>) => void
  processFile: (parseResult: CsvParseResult) => void
  setColumnMapping: (mapping: ColumnMapping) => void
  confirmMapping: () => void
  startImport: (deckId: string) => Promise<void>
  reset: () => void
}

const initialState: ImportState = {
  status: 'idle',
  file: null,
  parseResult: null,
  columnMapping: null,
  validationResult: null,
  options: DEFAULT_IMPORT_OPTIONS,
  importProgress: null,
  importResult: null,
  error: null,
}

export function useDeckCardsImport(): UseDeckCardsImportReturn {
  const { studyService } = useStudyData()
  const [state, setState] = useState<ImportState>(initialState)

  const setOptions = useCallback((options: Partial<ImportOptions>) => {
    setState((prev) => ({
      ...prev,
      options: { ...prev.options, ...options },
    }))
  }, [])

  const processFile = useCallback(
    (parseResult: CsvParseResult) => {
      // Suggest column mapping
      const suggested = suggestColumnMapping(parseResult.headers)

      // If all required fields are mapped, go to preview
      // Otherwise, go to mapping step
      if (suggested.missingRequired.length > 0) {
        setState((prev) => ({
          ...prev,
          status: 'mapping',
          parseResult,
          columnMapping: suggested.mapping,
          error: null,
        }))
      } else {
        // Apply mapping and validate
        const rows = applyColumnMapping(
          parseResult.rawRows,
          suggested.mapping,
          state.options,
        )
        const validationResult = validateRows(rows, state.options)

        setState((prev) => ({
          ...prev,
          status: 'preview',
          parseResult: { ...parseResult, rows },
          columnMapping: suggested.mapping,
          validationResult,
          error: null,
        }))
      }
    },
    [state.options],
  )

  const setColumnMapping = useCallback((mapping: ColumnMapping) => {
    setState((prev) => ({
      ...prev,
      columnMapping: mapping,
    }))
  }, [])

  const confirmMapping = useCallback(() => {
    if (!state.parseResult || !state.columnMapping) return

    // Check if required fields are mapped
    const mappedFields = new Set(Object.values(state.columnMapping))
    if (!mappedFields.has('front') || !mappedFields.has('back')) {
      setState((prev) => ({
        ...prev,
        error: 'Required fields (front and back) must be mapped',
      }))
      return
    }

    // Apply mapping and validate
    const rows = applyColumnMapping(
      state.parseResult.rawRows,
      state.columnMapping,
      state.options,
    )
    const validationResult = validateRows(rows, state.options)

    setState((prev) => ({
      ...prev,
      status: 'preview',
      parseResult: prev.parseResult ? { ...prev.parseResult, rows } : null,
      validationResult,
      error: null,
    }))
  }, [state.parseResult, state.columnMapping, state.options])

  const startImport = useCallback(
    async (deckId: string) => {
      if (!state.validationResult) return

      const rowsToImport = state.validationResult.validRows

      if (rowsToImport.length === 0) {
        setState((prev) => ({
          ...prev,
          error: 'No valid rows to import',
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        status: 'importing',
        importProgress: { current: 0, total: rowsToImport.length },
        error: null,
      }))

      try {
        // Convert rows to bulk items
        const cards: BulkCardItem[] = rowsToImport.map((row: ParsedCsvRow) => ({
          front: row.front,
          back: row.back,
          fonetica: row.phonetic || undefined,
          ttsEnabled: true,
        }))

        // Split into chunks for large imports
        const chunks: BulkCardItem[][] = []
        for (let i = 0; i < cards.length; i += CHUNK_SIZE) {
          chunks.push(cards.slice(i, i + CHUNK_SIZE))
        }

        let totalCreated = 0
        let totalFailed = 0
        const allErrors: ImportResult['errors'] = []

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const chunkOffset = i * CHUNK_SIZE

          const result = await studyService.bulkCreateCards({
            deckId,
            cards: chunk,
            options: {
              skipInvalidRows: state.options.skipInvalidRows,
              trimWhitespace: state.options.trimWhitespace,
            },
          })

          totalCreated += result.created
          totalFailed += result.failed

          // Adjust error indices to match original row numbers
          for (const error of result.errors) {
            allErrors.push({
              ...error,
              index: error.index + chunkOffset,
            })
          }

          setState((prev) => ({
            ...prev,
            importProgress: {
              current: Math.min((i + 1) * CHUNK_SIZE, rowsToImport.length),
              total: rowsToImport.length,
            },
          }))
        }

        setState((prev) => ({
          ...prev,
          status: 'complete',
          importResult: {
            created: totalCreated,
            failed: totalFailed,
            errors: allErrors,
          },
          importProgress: null,
        }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: getUserFacingErrorMessage(err, {
            fallbackKey: "Couldn't import the cards. Please try again.",
          }),
          importProgress: null,
        }))
      }
    },
    [state.validationResult, state.options],
  )

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    state,
    setOptions,
    processFile,
    setColumnMapping,
    confirmMapping,
    startImport,
    reset,
  }
}
