import { useEffect } from 'react'
import type { ToastVariant } from '@/shared/components/Toast'

type ShowToast = (
  msg: string,
  variant?: ToastVariant,
  duration?: number,
) => void

/**
 * Fires an error toast for each truthy error string whenever one changes.
 * Replaces repeated `useEffect(() => { if (err) showToast(err, 'error') })` blocks.
 */
export function useErrorToast(
  errors: Array<string | null | undefined>,
  showToast: ShowToast,
) {
  useEffect(() => {
    for (const err of errors) {
      if (err) showToast(err, 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...errors, showToast])
}
