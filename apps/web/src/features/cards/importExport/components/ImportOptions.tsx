import type { ImportOptions as ImportOptionsType } from '../types/importExport'

interface ImportOptionsProps {
  options: ImportOptionsType
  onChange: (options: Partial<ImportOptionsType>) => void
}

export function ImportOptions({ options, onChange }: ImportOptionsProps) {
  return (
    <div className="bg-surface-container-low rounded-lg p-4 space-y-3 border border-outline">
      <h3 className="font-medium text-neutral-900 mb-3">Import Options</h3>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.skipInvalidRows}
          onChange={(e) => onChange({ skipInvalidRows: e.target.checked })}
          className="rounded border-outline text-on-surface focus:outline-on-surface"
        />
        <span className="text-sm text-neutral-700">Ignore Invalid Lines</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.trimWhitespace}
          onChange={(e) => onChange({ trimWhitespace: e.target.checked })}
          className="rounded border-outline text-on-surface focus:outline-on-surface"
        />
        <span className="text-sm text-neutral-700">Remove Extra Spaces</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.ignoreDuplicates}
          onChange={(e) => onChange({ ignoreDuplicates: e.target.checked })}
          className="rounded border-outline text-on-surface focus:outline-on-surface"
        />
        <span className="text-sm text-neutral-700">
          Ignore Duplicates in File
        </span>
      </label>
    </div>
  )
}
