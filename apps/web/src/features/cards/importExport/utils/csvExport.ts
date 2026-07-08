import type { ExportCardItem } from '../types/importExport'

// =============================================================================
// CSV Escape
// =============================================================================

function escapeCsvField(value: string | undefined | null): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If contains comma, quote, newline, or leading/trailing whitespace, wrap in quotes
  if (/[",\n\r]/.test(stringValue) || stringValue !== stringValue.trim()) {
    // Escape quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""')
    return `"${escaped}"`
  }

  return stringValue
}

// =============================================================================
// CSV Generation
// =============================================================================

export function generateCsv(cards: ExportCardItem[]): string {
  const headers = ['front', 'back', 'phonetic']
  const rows: string[] = [headers.join(',')]

  for (const card of cards) {
    const row = [
      escapeCsvField(card.front),
      escapeCsvField(card.back),
      escapeCsvField(card.phonetic),
    ]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

// =============================================================================
// Download Helper
// =============================================================================

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// =============================================================================
// Error CSV Export
// =============================================================================

export interface ErrorExportRow {
  linha: number
  front: string
  back: string
  erro: string
}

export function generateErrorCsv(errors: ErrorExportRow[]): string {
  const headers = ['linha', 'front', 'back', 'erro']
  const rows: string[] = [headers.join(',')]

  for (const error of errors) {
    const row = [
      String(error.linha),
      escapeCsvField(error.front),
      escapeCsvField(error.back),
      escapeCsvField(error.erro),
    ]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}
