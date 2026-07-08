import type {
  ParsedCsvRow,
  RowValidationError,
  ValidationResult,
  ImportOptions,
  ColumnMapping,
  SuggestedMapping,
  FieldName,
} from '../types/importExport'

// =============================================================================
// Constants
// =============================================================================

const MAX_TEXT_LENGTH = 5000

// Header name mappings for auto-detection
const HEADER_ALIASES: Record<FieldName, string[]> = {
  front: ['texto', 'text', 'term', 'front', 'word', 'phrase', 'english'],
  back: [
    'significado',
    'meaning',
    'definition',
    'back',
    'translation',
    'portuguese',
  ],
  phonetic: ['phonetic', 'fonética', 'phonetic', 'phonetics', 'pronunciation'],
  ignore: [],
}

// =============================================================================
// Column Mapping
// =============================================================================

export function suggestColumnMapping(headers: string[]): SuggestedMapping {
  const mapping: ColumnMapping = {}
  const mappedFields = new Set<FieldName>()
  const unmappedColumns: string[] = []

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim()
    let matched = false

    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (field === 'ignore') continue

      if (aliases.some((alias) => normalizedHeader === alias.toLowerCase())) {
        // Don't map if already mapped
        if (!mappedFields.has(field as FieldName)) {
          mapping[header] = field as FieldName
          mappedFields.add(field as FieldName)
          matched = true
          break
        }
      }
    }

    if (!matched) {
      unmappedColumns.push(header)
      mapping[header] = 'ignore'
    }
  }

  // Check for missing required fields
  const requiredFields: FieldName[] = ['front', 'back']
  const missingRequired = requiredFields.filter((f) => !mappedFields.has(f))

  return { mapping, unmappedColumns, missingRequired }
}

export function applyColumnMapping(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  options: ImportOptions,
): ParsedCsvRow[] {
  return rawRows.map((row, index) => {
    const mapped: ParsedCsvRow = {
      front: '',
      back: '',
      _rowIndex: index + 2, // +2 for 1-based index and header row
    }

    for (const [csvColumn, field] of Object.entries(mapping)) {
      if (field === 'ignore') continue

      let value = row[csvColumn] || ''
      if (options.trimWhitespace) {
        value = value.trim()
      }

      if (field === 'front' || field === 'back' || field === 'phonetic') {
        mapped[field] = value
      }
    }

    return mapped
  })
}

// =============================================================================
// Row Validation
// =============================================================================

function validateRow(row: ParsedCsvRow): RowValidationError[] {
  const errors: RowValidationError[] = []

  // Required: front
  if (!row.front) {
    errors.push({
      row: row._rowIndex,
      field: 'front',
      message: 'Required field',
    })
  } else if (row.front.length > MAX_TEXT_LENGTH) {
    errors.push({
      row: row._rowIndex,
      field: 'front',
      message: `Exceeds ${MAX_TEXT_LENGTH} characters`,
    })
  }

  // Required: back
  if (!row.back) {
    errors.push({
      row: row._rowIndex,
      field: 'back',
      message: 'Required field',
    })
  } else if (row.back.length > MAX_TEXT_LENGTH) {
    errors.push({
      row: row._rowIndex,
      field: 'back',
      message: `Exceeds ${MAX_TEXT_LENGTH} characters`,
    })
  }

  return errors
}

// =============================================================================
// Deduplication
// =============================================================================

function getRowKey(row: ParsedCsvRow): string {
  return `${row.front}|${row.back}`.toLowerCase()
}

function findDuplicates(rows: ParsedCsvRow[]): Set<number> {
  const seen = new Map<string, number>()
  const duplicates = new Set<number>()

  for (const row of rows) {
    const key = getRowKey(row)
    const existingIndex = seen.get(key)

    if (existingIndex !== undefined) {
      duplicates.add(row._rowIndex)
    } else {
      seen.set(key, row._rowIndex)
    }
  }

  return duplicates
}

// =============================================================================
// Main Validation Function
// =============================================================================

export function validateRows(
  rows: ParsedCsvRow[],
  options: ImportOptions,
): ValidationResult {
  const errors: RowValidationError[] = []
  const validRows: ParsedCsvRow[] = []
  const invalidRows: ParsedCsvRow[] = []

  // Find duplicates
  const duplicateIndices = options.ignoreDuplicates
    ? findDuplicates(rows)
    : new Set<number>()

  for (const row of rows) {
    // Skip duplicates
    if (duplicateIndices.has(row._rowIndex)) {
      continue
    }

    const rowErrors = validateRow(row)

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      invalidRows.push(row)
    } else {
      validRows.push(row)
    }
  }

  return {
    valid: invalidRows.length === 0,
    validRows,
    invalidRows,
    errors,
    duplicateCount: duplicateIndices.size,
  }
}

// =============================================================================
// Error Formatting
// =============================================================================

export function formatValidationErrors(errors: RowValidationError[]): string {
  if (errors.length === 0) return ''

  const byRow = new Map<number, RowValidationError[]>()
  for (const error of errors) {
    const existing = byRow.get(error.row) || []
    existing.push(error)
    byRow.set(error.row, existing)
  }

  const lines: string[] = []
  for (const [row, rowErrors] of byRow) {
    const fields = rowErrors.map((e) => `${e.field}: ${e.message}`).join(', ')
    lines.push(`Line ${row}: ${fields}`)
  }

  return lines.join('\n')
}
