import type { ReactNode } from 'react'
import { SelectionSpeechStatus } from '@/shared/components/SelectionSpeechStatus'
import { useSelectionSpeech } from '@/shared/hooks/useSelectionSpeech'

export function SelectionSpeechProvider({ children }: { children: ReactNode }) {
  const { isPlaying, isSynthesizing } = useSelectionSpeech()

  return (
    <>
      {children}
      <SelectionSpeechStatus
        isPlaying={isPlaying}
        isSynthesizing={isSynthesizing}
      />
    </>
  )
}
