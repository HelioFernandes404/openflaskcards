export type LetterViewMode = 'both' | 'english' | 'portuguese' | 'reveal'

export interface LetterViewColumns {
  showEnglish: boolean
  showPortuguese: boolean
  revealPortuguese: boolean
}

export const LETTER_VIEW_MODES: readonly {
  id: LetterViewMode
  label: string
  description: string
}[] = [
  {
    id: 'both',
    label: 'Both',
    description: 'English and Portuguese side by side',
  },
  {
    id: 'english',
    label: 'English',
    description: 'Original lyrics only',
  },
  {
    id: 'portuguese',
    label: 'Portuguese',
    description: 'Translation only',
  },
  {
    id: 'reveal',
    label: 'Reveal',
    description: 'Tap each line to show its translation',
  },
]

export function getLetterViewColumns(mode: LetterViewMode): LetterViewColumns {
  switch (mode) {
    case 'english':
      return {
        showEnglish: true,
        showPortuguese: false,
        revealPortuguese: false,
      }
    case 'portuguese':
      return {
        showEnglish: false,
        showPortuguese: true,
        revealPortuguese: false,
      }
    case 'reveal':
      return {
        showEnglish: true,
        showPortuguese: false,
        revealPortuguese: true,
      }
    default:
      return {
        showEnglish: true,
        showPortuguese: true,
        revealPortuguese: false,
      }
  }
}
