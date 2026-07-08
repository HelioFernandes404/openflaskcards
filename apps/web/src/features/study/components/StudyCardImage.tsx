import { useEffect, useState } from 'react'
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage'
import { Skeleton } from '@/shared/components/skeleton'
import { cn } from '@/shared/utils'

interface StudyCardImageProps {
  src: string
  alt: string
  variant?: 'front' | 'back'
  className?: string
}

export function StudyCardImage({
  src,
  alt,
  variant = 'front',
  className,
}: StudyCardImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [src])

  if (failed) return null

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center overflow-hidden rounded-xl',
        'border border-outline bg-surface-container-lowest',
        variant === 'front'
          ? 'aspect-[4/3] max-h-[min(36vh,360px)] max-w-xl'
          : 'aspect-[4/3] max-h-[min(28vh,280px)] max-w-lg border-outline-variant bg-transparent',
        className,
      )}
    >
      {!loaded && <Skeleton className="absolute inset-0 rounded-xl" />}

      <AuthenticatedImage
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'max-h-full max-w-full object-contain p-2 transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}
