import type { ColumnMapping, FieldName } from '../types/importExport'
import { Select } from '@/shared/components/select'

interface CsvColumnMapperProps {
  headers: string[]
  mapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
  onConfirm: () => void
  error?: string | null
}

const FIELD_OPTIONS: { value: FieldName; label: string; required: boolean }[] =
  [
    { value: 'front', label: 'Front (required)', required: true },
    { value: 'back', label: 'Back (required)', required: true },
    { value: 'phonetic', label: 'Phonetic', required: false },
    { value: 'ignore', label: 'Ignore', required: false },
  ]

export function CsvColumnMapper({
  headers,
  mapping,
  onMappingChange,
  onConfirm,
  error,
}: CsvColumnMapperProps) {
  const handleChange = (header: string, field: FieldName) => {
    onMappingChange({
      ...mapping,
      [header]: field,
    })
  }

  // Check which required fields are mapped
  const mappedFields = new Set(Object.values(mapping))
  const hasFront = mappedFields.has('front')
  const hasBack = mappedFields.has('back')
  const canConfirm = hasFront && hasBack

  return (
    <div className="space-y-4">
      <div className="bg-surface-container border border-outline-strong rounded-lg p-4">
        <h3 className="font-medium text-on-surface mb-2">
          Column Mapping Required
        </h3>
        <p className="text-sm text-on-surface-variant">
          The CSV file has columns that were not automatically recognized.
          Please map each column to the corresponding field.
        </p>
      </div>

      <div className="border border-outline rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                CSV Column
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Map To
              </th>
            </tr>
          </thead>
          <tbody className="bg-neutral-0 divide-y divide-white/10">
            {headers.map((header) => (
              <tr key={header}>
                <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                  {header}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={mapping[header] || 'ignore'}
                    onChange={(e) =>
                      handleChange(header, e.target.value as FieldName)
                    }
                  >
                    {FIELD_OPTIONS.map((option) => {
                      // Disable if already mapped to another column (except ignore)
                      const isAlreadyMapped =
                        option.value !== 'ignore' &&
                        Object.entries(mapping).some(
                          ([h, f]) => h !== header && f === option.value,
                        )

                      return (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={isAlreadyMapped}
                        >
                          {option.label}
                          {isAlreadyMapped ? ' (already mapped)' : ''}
                        </option>
                      )
                    })}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span
          className={`px-2 py-1 rounded ${hasFront ? 'bg-success-200 text-success-900' : 'bg-danger-50 text-danger-800'}`}
        >
          {hasFront ? '✓' : '✗'} Front
        </span>
        <span
          className={`px-2 py-1 rounded ${hasBack ? 'bg-success-200 text-success-900' : 'bg-danger-50 text-danger-800'}`}
        >
          {hasBack ? '✓' : '✗'} Back
        </span>
      </div>

      {error && <div className="text-sm text-danger-800">{error}</div>}

      <button
        onClick={onConfirm}
        disabled={!canConfirm}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          canConfirm
            ? 'bg-primary-500 text-neutral-0 hover:bg-primary-600'
            : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
        }`}
      >
        Confirm Mapping
      </button>
    </div>
  )
}
