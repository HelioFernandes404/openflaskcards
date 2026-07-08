import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CardBackDisplay } from './CardBackDisplay'
import type { CardBack } from '@/features/cards/types/card'

const baseCard: CardBack = {
  id: 'card-1',
  deckId: 'deck-1',
  front: 'hello',
  back: 'hello',
  stability: 1,
  difficulty: 5,
  due: '2026-07-03T00:00:00Z',
  state: 'review',
  reps: 3,
  lapses: 0,
}

describe('CardBackDisplay', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders card back meaning in serif content font', () => {
    render(<CardBackDisplay card={{ ...baseCard, back: 'bonjour' }} />)
    const text = screen.getByText('bonjour')
    expect(text.closest('.font-serif')).toBeInTheDocument()
  })

  it('renders bold markdown with visibly distinct styling', () => {
    render(
      <CardBackDisplay card={{ ...baseCard, back: 'significa **mundo**' }} />,
    )
    const bold = screen.getByText('mundo')
    expect(bold.tagName).toBe('STRONG')
    expect(bold).toHaveClass('font-bold')
  })

  it('renders italic markdown with italic styling', () => {
    render(
      <CardBackDisplay card={{ ...baseCard, back: 'significa *mundo*' }} />,
    )
    const italic = screen.getByText('mundo')
    expect(italic.tagName).toBe('EM')
    expect(italic).toHaveClass('italic')
  })
})
