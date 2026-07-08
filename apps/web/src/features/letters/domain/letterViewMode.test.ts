import { describe, expect, it } from 'vitest'
import { getLetterViewColumns, type LetterViewMode } from './letterViewMode'

describe('getLetterViewColumns', () => {
  it.each<[LetterViewMode, ReturnType<typeof getLetterViewColumns>]>([
    [
      'both',
      { showEnglish: true, showPortuguese: true, revealPortuguese: false },
    ],
    [
      'english',
      { showEnglish: true, showPortuguese: false, revealPortuguese: false },
    ],
    [
      'portuguese',
      { showEnglish: false, showPortuguese: true, revealPortuguese: false },
    ],
    [
      'reveal',
      { showEnglish: true, showPortuguese: false, revealPortuguese: true },
    ],
  ])('maps %s mode to column visibility', (mode, expected) => {
    expect(getLetterViewColumns(mode)).toEqual(expected)
  })
})
