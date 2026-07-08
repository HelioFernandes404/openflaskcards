import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence } from 'motion/react'
import { Toast, type ToastVariant } from '@/shared/components/Toast'

interface ToastState {
  message: string
  variant: ToastVariant
  duration?: number
}

interface NotificationContextValue {
  showToast: (msg: string, variant?: ToastVariant, duration?: number) => void
  dismissToast: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback(
    (msg: string, variant: ToastVariant = 'success', duration?: number) => {
      const finalDuration =
        duration !== undefined ? duration : variant === 'error' ? 0 : 3000
      setToast({ message: msg, variant, duration: finalDuration })
    },
    [],
  )

  const dismissToast = useCallback(() => setToast(null), [])

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  )
}

function ToastHost({
  toast,
  onDismiss,
}: {
  toast: ToastState | null
  onDismiss: () => void
}) {
  return (
    <AnimatePresence>
      {toast && (
        <Toast
          key={toast.message}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onClose={onDismiss}
        />
      )}
    </AnimatePresence>
  )
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return ctx
}
