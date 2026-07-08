import { useCallback, useRef, useState } from 'react'
import { Spinner } from '@/shared/components/spinner'

interface CsvUploaderProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  parsing?: boolean
}

export function CsvUploader({
  onFileSelect,
  disabled,
  parsing,
}: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (file.name.endsWith('.csv') || file.type.includes('csv')) {
          onFileSelect(file)
        }
      }
    },
    [disabled, onFileSelect],
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files[0])
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [onFileSelect],
  )

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-outline-strong bg-surface-container' : 'border-outline'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-outline-strong hover:bg-surface-container-low'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {parsing ? (
        <div className="flex flex-col items-center gap-2">
          <Spinner />
          <span className="text-on-surface-variant">Processing file...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-12 h-12 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="text-on-surface-variant">
            <span className="font-medium text-on-surface">Click to select</span>{' '}
            or drag a CSV file
          </div>
          <p className="text-sm text-neutral-500">
            Format: front, back, fonetica (optional)
          </p>
        </div>
      )}
    </div>
  )
}
