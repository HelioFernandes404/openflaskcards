import { useCallback, useState } from 'react'

const STORAGE_KEY = 'openflaskcards.dashboard.summary-visible'

function readStoredVisibility(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function useDashboardSummaryVisible(): [
  boolean,
  (visible: boolean) => void,
] {
  const [visible, setVisibleState] = useState(readStoredVisibility)

  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore quota / private mode
    }
  }, [])

  return [visible, setVisible]
}
