import { useRef, useState, useEffect, useCallback } from 'react'
import { ImagePlus, RefreshCw, X } from 'lucide-react'
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage'
import { Button } from '@/shared/components/button'
import { Skeleton } from '@/shared/components/skeleton'
import { Spinner } from '@/shared/components/spinner'
import { ApiStudyService } from '@/features/study/services/ApiStudyService'
import { cn } from '@/shared/utils'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MiB

const service = new ApiStudyService()

interface ImageUploaderProps {
  value?: string
  onChange: (url: string | undefined) => void
  onError?: (message: string) => void
  disabled?: boolean
  compact?: boolean
}

export function ImageUploader({
  value,
  onChange,
  onError,
  disabled,
  compact,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const handleError = (msg: string) => {
    setInlineError(msg)
    onError?.(msg)
  }

  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
    setInlineError(null)
  }, [value])

  const handleFile = async (file: File) => {
    setInlineError(null)
    setImageFailed(false)

    if (!ALLOWED_TYPES.includes(file.type)) {
      handleError('Unsupported format. Use PNG, JPEG, WebP, or GIF.')
      return
    }
    if (file.size > MAX_BYTES) {
      handleError('Image must be 10 MiB or smaller.')
      return
    }

    setUploading(true)
    try {
      const { url } = await service.uploadImage(file)
      onChange(url)
    } catch {
      handleError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  const handleRemove = () => {
    setInlineError(null)
    setImageFailed(false)
    onChange(undefined)
    if (inputRef.current) inputRef.current.value = ''
  }

  const openFilePicker = () => {
    if (!isDisabled) inputRef.current?.click()
  }

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageFailed(false)
    setInlineError(null)
  }, [])

  const handleImageError = useCallback(() => {
    setImageFailed(true)
    setImageLoaded(false)
    const message = 'Image unavailable. Upload a new one.'
    setInlineError(message)
    onError?.(message)
  }, [onError])

  const isDisabled = disabled || uploading

  const previewFrameClass = compact
    ? 'flex items-center gap-2 rounded-base border border-outline bg-surface-container p-1.5'
    : 'relative overflow-hidden rounded-base border border-outline bg-surface-container'

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
        disabled={isDisabled}
        aria-label="Upload image"
      />

      {value ? (
        <div className={previewFrameClass}>
          {imageFailed ? (
            <div
              className={cn(
                'flex w-full flex-col items-center justify-center gap-3 text-center',
                compact ? 'px-2 py-3' : 'min-h-44 px-6 py-8',
              )}
            >
              <p className="text-xs text-on-surface-variant">
                Image unavailable on the server.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openFilePicker}
                disabled={isDisabled}
                className="cursor-pointer"
              >
                <ImagePlus size={14} strokeWidth={1.5} />
                Upload again
              </Button>
            </div>
          ) : compact ? (
            <>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
                {!imageLoaded && (
                  <Skeleton className="absolute inset-0 rounded" />
                )}
                <AuthenticatedImage
                  src={value}
                  alt="Card image"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className={cn(
                    'h-12 w-12 rounded object-cover transition-opacity duration-150',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </div>
              <span className="min-w-0 flex-1 truncate text-xs text-on-surface-variant">
                Image attached
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isDisabled}
              aria-label="Change image"
              className="group relative block min-h-44 w-full cursor-pointer disabled:cursor-not-allowed"
            >
              {!imageLoaded && (
                <Skeleton className="absolute inset-0 rounded-none" />
              )}
              <AuthenticatedImage
                src={value}
                alt="Card image"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={cn(
                  'max-h-44 w-full object-cover transition-opacity duration-150 group-hover:opacity-80',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                )}
              />
              {imageLoaded && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-900/0 transition-colors duration-150 group-hover:bg-neutral-900/45">
                  <span className="flex items-center gap-1.5 rounded-full border border-outline-strong bg-surface/90 px-3 py-1.5 text-xs font-medium text-on-surface opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <RefreshCw size={12} strokeWidth={1.5} aria-hidden="true" />
                    Change image
                  </span>
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isDisabled}
            aria-label="Remove image"
            className={cn(
              'shrink-0 cursor-pointer rounded-full p-1 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50',
              compact || imageFailed
                ? 'ml-auto'
                : 'absolute top-1.5 right-1.5 bg-neutral-900/70 text-neutral-0 hover:bg-neutral-900',
            )}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={isDisabled}
          className={cn(
            'flex w-full cursor-pointer items-center justify-center gap-2 rounded-base border border-dashed border-outline text-on-surface-variant transition-colors duration-150 hover:border-outline-strong hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50',
            compact ? 'py-2 text-xs font-medium' : 'py-3 text-sm font-medium',
          )}
        >
          {uploading ? (
            <>
              <Spinner size="sm" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus size={16} strokeWidth={1.5} />
              <span>Add image</span>
            </>
          )}
        </button>
      )}

      {inlineError && <p className="text-xs text-danger-800">{inlineError}</p>}
    </div>
  )
}
