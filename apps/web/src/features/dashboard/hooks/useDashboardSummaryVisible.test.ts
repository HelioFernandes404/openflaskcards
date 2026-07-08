import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDashboardSummaryVisible } from './useDashboardSummaryVisible'

const STORAGE_KEY = 'openflaskcards.dashboard.summary-visible'

describe('useDashboardSummaryVisible', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to visible when nothing is stored', () => {
    const { result } = renderHook(() => useDashboardSummaryVisible())
    expect(result.current[0]).toBe(true)
  })

  it('reads false from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'false')
    const { result } = renderHook(() => useDashboardSummaryVisible())
    expect(result.current[0]).toBe(false)
  })

  it('persists visibility changes', () => {
    const { result } = renderHook(() => useDashboardSummaryVisible())

    act(() => {
      result.current[1](false)
    })

    expect(result.current[0]).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')
  })
})
