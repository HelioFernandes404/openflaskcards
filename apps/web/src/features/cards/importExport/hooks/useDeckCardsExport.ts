import { useState, useCallback } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { generateCsv, downloadCsv } from '../utils/csvExport'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'

interface UseDeckCardsExportReturn {
  exporting: boolean
  error: string | null
  exportCards: (deckId: string, deckName: string) => Promise<void>
}

export function useDeckCardsExport(): UseDeckCardsExportReturn {
  const { studyService } = useStudyData()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportCards = useCallback(
    async (deckId: string, deckName: string) => {
      setExporting(true)
      setError(null)

      try {
        const cards = await studyService.exportDeckCards(deckId)

        if (cards.length === 0) {
          setError('Deck has no cards to export')
          setExporting(false)
          return
        }

        const csvContent = generateCsv(cards)

        // Sanitize deck name for filename
        const safeName = deckName
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 50)

        const filename = `deck-${safeName}-cards.csv`
        downloadCsv(csvContent, filename)

        setExporting(false)
      } catch (err) {
        setError(
          getUserFacingErrorMessage(err, {
            fallbackKey: "Couldn't export the cards. Please try again.",
          }),
        )
        setExporting(false)
      }
    },
    [studyService],
  )

  return {
    exporting,
    error,
    exportCards,
  }
}
