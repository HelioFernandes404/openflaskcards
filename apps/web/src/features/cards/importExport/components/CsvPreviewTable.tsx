import type { ParsedCsvRow, RowValidationError } from '../types/importExport'

interface CsvPreviewTableProps {
  rows: ParsedCsvRow[]
  errors: RowValidationError[]
  maxRows?: number
  totalRows: number
}

export function CsvPreviewTable({
  rows,
  errors,
  maxRows = 50,
  totalRows,
}: CsvPreviewTableProps) {
  const displayRows = rows.slice(0, maxRows)
  const errorsByRow = new Map<number, RowValidationError[]>()

  for (const error of errors) {
    const existing = errorsByRow.get(error.row) || []
    existing.push(error)
    errorsByRow.set(error.row, existing)
  }

  const getRowErrors = (rowIndex: number): RowValidationError[] => {
    return errorsByRow.get(rowIndex) || []
  }

  const hasError = (rowIndex: number, field: string): boolean => {
    const rowErrors = getRowErrors(rowIndex)
    return rowErrors.some((e) => e.field === field)
  }

  const getErrorMessage = (rowIndex: number, field: string): string | null => {
    const rowErrors = getRowErrors(rowIndex)
    const error = rowErrors.find((e) => e.field === field)
    return error?.message || null
  }

  return (
    <div className="border border-outline rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Front
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Back
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider w-32">
                Phonetic
              </th>
            </tr>
          </thead>
          <tbody className="bg-neutral-0 divide-y divide-white/10">
            {displayRows.map((row) => {
              const rowErrors = getRowErrors(row._rowIndex)
              const hasRowError = rowErrors.length > 0

              return (
                <tr
                  key={row._rowIndex}
                  className={hasRowError ? 'bg-danger-50' : ''}
                >
                  <td className="px-3 py-2 text-sm text-neutral-500">
                    {row._rowIndex}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div
                      className={`truncate max-w-xs ${hasError(row._rowIndex, 'front') ? 'text-danger-800' : 'text-neutral-900'}`}
                    >
                      {row.front || (
                        <span className="text-neutral-400 italic">(empty)</span>
                      )}
                    </div>
                    {getErrorMessage(row._rowIndex, 'front') && (
                      <div className="text-xs text-danger-800 mt-1">
                        {getErrorMessage(row._rowIndex, 'front')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div
                      className={`truncate max-w-xs ${hasError(row._rowIndex, 'back') ? 'text-danger-800' : 'text-neutral-900'}`}
                    >
                      {row.back || (
                        <span className="text-neutral-400 italic">(empty)</span>
                      )}
                    </div>
                    {getErrorMessage(row._rowIndex, 'back') && (
                      <div className="text-xs text-danger-800 mt-1">
                        {getErrorMessage(row._rowIndex, 'back')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-neutral-500 truncate max-w-[8rem]">
                    {row.phonetic || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalRows > maxRows && (
        <div className="px-4 py-2 bg-surface-container-low text-sm text-neutral-500 border-t border-outline">
          Showing {maxRows} of {totalRows} rows
        </div>
      )}
    </div>
  )
}
