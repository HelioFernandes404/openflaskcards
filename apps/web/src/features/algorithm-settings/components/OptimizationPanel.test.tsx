import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { OptimizationPanel } from './OptimizationPanel'

describe('OptimizationPanel', () => {
  afterEach(() => cleanup())
  it('calls onOptimize when button is clicked', () => {
    const onOptimize = vi.fn()
    render(
      <OptimizationPanel
        status="idle"
        lastOptimization={null}
        isOptimizing={false}
        onOptimize={onOptimize}
      />,
    )

    fireEvent.click(screen.getByTestId('fsrs-optimize-button'))
    expect(onOptimize).toHaveBeenCalledOnce()
  })

  it('disables button while running', () => {
    render(
      <OptimizationPanel
        status="running"
        lastOptimization={null}
        isOptimizing={false}
        onOptimize={vi.fn()}
      />,
    )

    expect(screen.getByTestId('fsrs-optimize-button')).toHaveProperty(
      'disabled',
      true,
    )
  })
})
