import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import type { CsvParseResult } from '../types/importExport'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'

interface UseCsvParserReturn {
  parsing: boolean
  error: string | null
  parseFile: (file: File) => Promise<CsvParseResult | null>
  reset: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const PREVIEW_LIMIT = 50

export function useCsvParser(): UseCsvParserReturn {
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(
    async (file: File): Promise<CsvParseResult | null> => {
      setParsing(true)
      setError(null)

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        setParsing(false)
        return null
      }

      // Validate file type
      if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
        setError('File must be CSV')
        setParsing(false)
        return null
      }

      return new Promise((resolve) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          encoding: 'UTF-8',
          delimitersToGuess: [',', ';', '\t', '|'],
          complete: (results) => {
            setParsing(false)

            if (results.errors.length > 0) {
              const firstError = results.errors[0]
              if (firstError.type === 'Quotes') {
                setError('Formatting error: unclosed quotes. Check the file.')
              } else if (firstError.type === 'Delimiter') {
                setError(
                  'Formatting error: invalid delimiter. Use comma, semicolon, or tab.',
                )
              } else {
                setError(
                  "We couldn't process that CSV. Check the file format and try again.",
                )
              }
              resolve(null)
              return
            }

            if (results.data.length === 0) {
              setError('CSV file is empty or has no valid data')
              resolve(null)
              return
            }

            const headers = results.meta.fields || []
            if (headers.length === 0) {
              setError('Unable to detect CSV headers')
              resolve(null)
              return
            }

            resolve({
              headers,
              rows: [], // Will be populated after column mapping
              rawRows: results.data,
              totalRows: results.data.length,
            })
          },
          error: (err) => {
            setParsing(false)
            setError(
              getUserFacingErrorMessage(err, {
                fallbackKey:
                  "We couldn't read that file. Try another CSV and try again.",
              }),
            )
            resolve(null)
          },
        })
      })
    },
    [],
  )

  const reset = useCallback(() => {
    setParsing(false)
    setError(null)
  }, [])

  return {
    parsing,
    error,
    parseFile,
    reset,
  }
}

export { PREVIEW_LIMIT }
