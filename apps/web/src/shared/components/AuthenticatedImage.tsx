import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/shared/services/apiClient'

const INTERNAL_MEDIA_PREFIX = '/api/v1/media/'

function isInternalMediaUrl(src: string): boolean {
  return src.startsWith(INTERNAL_MEDIA_PREFIX)
}

export interface AuthenticatedImageProps {
  src: string
  alt: string
  className?: string
  onLoad?: () => void
  onError?: () => void
}

/**
 * AuthenticatedImage - Renders an <img> for both public and private media URLs.
 *
 * - Internal media URLs (`/api/v1/media/:id`) are fetched as a Blob using the
 *   authenticated API client and rendered via `URL.createObjectURL`.
 * - External URLs, `data:` URLs, and `blob:` URLs are rendered directly.
 */
export function AuthenticatedImage({
  src,
  alt,
  className,
  onLoad,
  onError,
}: AuthenticatedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const onLoadRef = useRef(onLoad)
  const onErrorRef = useRef(onError)
  onLoadRef.current = onLoad
  onErrorRef.current = onError

  useEffect(() => {
    if (!src || !isInternalMediaUrl(src)) {
      setObjectUrl(null)
      return
    }

    let currentUrl: string | null = null
    let cancelled = false
    const requestPath = src.replace(/^\/api\/v1/, '')

    setObjectUrl(null)

    apiClient
      .getBlob(requestPath)
      .then((response) => {
        if (cancelled) return
        currentUrl = URL.createObjectURL(response.data)
        setObjectUrl(currentUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setObjectUrl(null)
          onErrorRef.current?.()
        }
      })

    return () => {
      cancelled = true
      setObjectUrl(null)
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [src])

  if (!src) return null

  if (isInternalMediaUrl(src)) {
    if (!objectUrl) return null
    return (
      <img
        src={objectUrl}
        alt={alt}
        className={className}
        onLoad={() => onLoadRef.current?.()}
        onError={() => onErrorRef.current?.()}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={() => onLoadRef.current?.()}
      onError={() => onErrorRef.current?.()}
    />
  )
}
