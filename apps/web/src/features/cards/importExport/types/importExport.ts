// =============================================================================
// CSV Parsing Types
// =============================================================================

export interface ParsedCsvRow {
  front: string
  back: string
  fonetica?: string
  _rowIndex: number // Original row index for error reporting
}

export interface CsvParseResult {
  headers: string[]
  rows: ParsedCsvRow[]
  rawRows: Record<string, string>[] // Original rows before mapping
  totalRows: number
}

// =============================================================================
// Column Mapping Types
// =============================================================================

export type FieldName = 'front' | 'back' | 'phonetic' | 'ignore'

export interface ColumnMapping {
  [csvColumn: string]: FieldName
}

export interface SuggestedMapping {
  mapping: ColumnMapping
  unmappedColumns: string[]
  missingRequired: FieldName[]
}

// =============================================================================
// Validation Types
// =============================================================================

export interface RowValidationError {
  row: number
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  validRows: ParsedCsvRow[]
  invalidRows: ParsedCsvRow[]
  errors: RowValidationError[]
  duplicateCount: number
}

// =============================================================================
// Import Options
// =============================================================================

export interface ImportOptions {
  skipInvalidRows: boolean
  trimWhitespace: boolean
  ignoreDuplicates: boolean
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  skipInvalidRows: true,
  trimWhitespace: true,
  ignoreDuplicates: true,
}

// =============================================================================
// Import State Machine
// =============================================================================

export type ImportStatus =
  | 'idle'
  | 'parsing'
  | 'preview'
  | 'mapping'
  | 'validating'
  | 'importing'
  | 'complete'
  | 'error'

export interface ImportState {
  status: ImportStatus
  file: File | null
  parseResult: CsvParseResult | null
  columnMapping: ColumnMapping | null
  validationResult: ValidationResult | null
  options: ImportOptions
  importProgress: { current: number; total: number } | null
  importResult: ImportResult | null
  error: string | null
}

// =============================================================================
// API Types
// =============================================================================

export interface BulkCardItem {
  front: string
  back: string
  fonetica?: string
  ttsEnabled?: boolean
}

export interface BulkImportRequest {
  deckId: string
  cards: BulkCardItem[]
  options?: {
    skipInvalidRows?: boolean
    trimWhitespace?: boolean
  }
}

export interface BulkError {
  index: number
  field?: string
  message: string
}

export interface ImportResult {
  created: number
  failed: number
  errors: BulkError[]
}

export interface ExportCardItem {
  front: string
  back: string
  fonetica?: string
}
