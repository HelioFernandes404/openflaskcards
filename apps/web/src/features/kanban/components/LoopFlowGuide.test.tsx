import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoopFlowGuide } from './LoopFlowGuide'
import { LOOP_HELP_STEPS } from '../domain/loopHelp'

describe('LOOP_HELP_STEPS', () => {
  it('covers the full loop lifecycle in order: explore, promote, implement, review, merge', () => {
    const ids = LOOP_HELP_STEPS.map((step) => step.id)
    expect(ids).toEqual(['explore', 'promote', 'implement', 'review', 'merge'])
  })

  it('marks human-gate steps so the UI can distinguish them from agent steps', () => {
    const humanSteps = LOOP_HELP_STEPS.filter((step) => step.actor === 'human')
    expect(humanSteps.map((step) => step.id)).toEqual(['promote', 'merge'])
  })

  it('every agent step has a copyable command starting with a slash', () => {
    for (const step of LOOP_HELP_STEPS.filter((s) => s.actor === 'agent')) {
      expect(step.command).toMatch(/^\//)
    }
  })
})

describe('LoopFlowGuide', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders every step title and its command', () => {
    render(<LoopFlowGuide />)
    for (const step of LOOP_HELP_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument()
      if (step.command) {
        expect(screen.getByText(step.command)).toBeInTheDocument()
      }
    }
  })

  it('copies the step command to the clipboard when the copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<LoopFlowGuide />)

    const firstCommandStep = LOOP_HELP_STEPS.find((step) => step.command)
    if (!firstCommandStep?.command) throw new Error('expected a command step')

    fireEvent.click(screen.getByTestId(`loop-help-copy-${firstCommandStep.id}`))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(firstCommandStep.command)
    })
  })

  it('shows the card template with a testable done condition section', () => {
    render(<LoopFlowGuide />)
    expect(screen.getByTestId('loop-help-card-template').textContent).toContain(
      '## Done condition',
    )
  })
})
