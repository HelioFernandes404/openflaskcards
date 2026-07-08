import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../types/kanbanCard'
import { KanbanCardDetailModal } from './KanbanCardDetailModal'

const baseCard: KanbanCard = {
  id: 'card-1',
  userId: 'user-1',
  title: 'Fix login bug',
  description: `## Context
The **login** form fails on empty email.

## Done condition
\`\`\`bash
cd apps/api && make test
\`\`\``,
  status: 'todo',
  priority: 'high',
  assignee: 'claude_code',
  position: 0,
  type: 'bug',
  verificationNote: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

describe('KanbanCardDetailModal', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders title, badges, and markdown body with bold text', () => {
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack
        canMoveForward
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    expect(screen.getByTestId('kanban-card-detail-modal')).toBeInTheDocument()
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText('login').tagName).toBe('STRONG')
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
  })

  it('renders done condition in a dedicated callout', () => {
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack={false}
        canMoveForward
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    const callout = screen.getByTestId('kanban-card-done-condition')
    expect(callout).toBeInTheDocument()
    expect(callout).toHaveTextContent('cd apps/api && make test')
  })

  it('shows verification note with markdown when card is in progress', () => {
    const card: KanbanCard = {
      ...baseCard,
      status: 'in_progress',
      verificationNote: 'attempt 1: **TestX** failed',
    }

    render(
      <KanbanCardDetailModal
        card={card}
        isOpen
        canMoveBack
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    const note = screen.getByTestId('kanban-card-verification-note')
    expect(note).toBeInTheDocument()
    expect(screen.getByText('TestX').tagName).toBe('STRONG')
  })

  it('does not render verification note for non in-progress cards', () => {
    render(
      <KanbanCardDetailModal
        card={{ ...baseCard, verificationNote: 'attempt 1: failed' }}
        isOpen
        canMoveBack={false}
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    expect(
      screen.queryByTestId('kanban-card-verification-note'),
    ).not.toBeInTheDocument()
  })

  it('calls onEdit with the card when Edit is clicked', () => {
    const onEdit = vi.fn()
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack={false}
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('kanban-card-detail-edit'))
    expect(onEdit).toHaveBeenCalledWith(baseCard)
  })

  it('calls onMoveBack when move back is clicked', () => {
    const onMoveBack = vi.fn()
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={onMoveBack}
        onMoveForward={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('kanban-card-detail-move-back'))
    expect(onMoveBack).toHaveBeenCalledWith('card-1')
  })

  it('disables move back when canMoveBack is false', () => {
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack={false}
        canMoveForward
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    expect(screen.getByTestId('kanban-card-detail-move-back')).toBeDisabled()
  })

  it('calls onMoveForward when move forward is clicked', () => {
    const onMoveForward = vi.fn()
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack={false}
        canMoveForward
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={onMoveForward}
      />,
    )

    fireEvent.click(screen.getByTestId('kanban-card-detail-move-forward'))
    expect(onMoveForward).toHaveBeenCalledWith('card-1')
  })

  it('calls onDelete with card id when Delete is clicked', () => {
    const onDelete = vi.fn()
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack={false}
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('kanban-card-detail-delete'))
    expect(onDelete).toHaveBeenCalledWith('card-1')
  })

  it('does not render done condition text in the markdown body section', () => {
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen
        canMoveBack={false}
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    const body = screen.getByTestId('kanban-card-detail-body')
    expect(body).not.toHaveTextContent('cd apps/api && make test')
  })

  it('does not render when closed', () => {
    render(
      <KanbanCardDetailModal
        card={baseCard}
        isOpen={false}
        canMoveBack={false}
        canMoveForward={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveBack={vi.fn()}
        onMoveForward={vi.fn()}
      />,
    )

    expect(
      screen.queryByTestId('kanban-card-detail-modal'),
    ).not.toBeInTheDocument()
  })
})
