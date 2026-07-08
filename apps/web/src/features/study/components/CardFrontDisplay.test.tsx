import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CardFrontDisplay } from './CardFrontDisplay'
import type { CardFront } from '@/features/cards/types/card'

const baseCard: CardFront = {
  id: 'card-1',
  deckId: 'deck-1',
  front: 'hello',
  ttsEnabled: false,
  state: 'review',
  reps: 3,
}

describe('CardFrontDisplay', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders card front text in serif content font', () => {
    render(<CardFrontDisplay card={{ ...baseCard, front: 'bonjour' }} />)
    const text = screen.getByText('bonjour')
    expect(text.closest('.font-serif')).toBeInTheDocument()
  })

  it('renders bold markdown with visibly distinct styling', () => {
    render(<CardFrontDisplay card={{ ...baseCard, front: 'say **world**' }} />)
    const bold = screen.getByText('world')
    expect(bold.tagName).toBe('STRONG')
    expect(bold).toHaveClass('font-bold')
  })

  it('renders italic markdown with italic styling', () => {
    render(<CardFrontDisplay card={{ ...baseCard, front: 'say *world*' }} />)
    const italic = screen.getByText('world')
    expect(italic.tagName).toBe('EM')
    expect(italic).toHaveClass('italic')
  })
})
