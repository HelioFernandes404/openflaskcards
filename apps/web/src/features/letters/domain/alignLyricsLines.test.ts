import { describe, expect, it } from 'vitest'
import {
  alignLyricsLines,
  getLetterPreview,
  getLyricsLineStats,
} from './alignLyricsLines'

describe('alignLyricsLines', () => {
  it('pairs lines by index', () => {
    expect(
      alignLyricsLines(
        'Memories consume\nLike opening the wound',
        'Memórias consomem\nComo se abrissem a ferida',
      ),
    ).toEqual([
      { id: '0', english: 'Memories consume', portuguese: 'Memórias consomem' },
      {
        id: '1',
        english: 'Like opening the wound',
        portuguese: 'Como se abrissem a ferida',
      },
    ])
  })

  it('handles uneven line counts', () => {
    expect(alignLyricsLines('Line one\nLine two', 'Linha um')).toEqual([
      { id: '0', english: 'Line one', portuguese: 'Linha um' },
      { id: '1', english: 'Line two', portuguese: '' },
    ])
  })

  it('preserves blank lines for verse spacing', () => {
    expect(alignLyricsLines('Verse\n\nChorus', 'Verso\n\nRefrão')).toEqual([
      { id: '0', english: 'Verse', portuguese: 'Verso' },
      { id: '1', english: '', portuguese: '' },
      { id: '2', english: 'Chorus', portuguese: 'Refrão' },
    ])
  })
})

describe('getLyricsLineStats', () => {
  it('counts lines in both columns', () => {
    expect(
      getLyricsLineStats('Line one\nLine two', 'Linha um\nLinha dois'),
    ).toEqual({
      englishCount: 2,
      portugueseCount: 2,
      pairedCount: 2,
      hasMismatch: false,
    })
  })

  it('flags mismatched line counts', () => {
    expect(getLyricsLineStats('One\nTwo\nThree', 'Um')).toEqual({
      englishCount: 3,
      portugueseCount: 1,
      pairedCount: 3,
      hasMismatch: true,
    })
  })

  it('includes blank lines in the count', () => {
    expect(getLyricsLineStats('Verse\n\nChorus', 'Verso\n\nRefrão')).toEqual({
      englishCount: 3,
      portugueseCount: 3,
      pairedCount: 3,
      hasMismatch: false,
    })
  })
})

describe('getLetterPreview', () => {
  it('returns the first non-empty english line', () => {
    expect(
      getLetterPreview('\n\nMemories consume\nLike opening the wound'),
    ).toBe('Memories consume')
  })

  it('returns empty string when lyrics are blank', () => {
    expect(getLetterPreview('  \n  ')).toBe('')
  })
})
