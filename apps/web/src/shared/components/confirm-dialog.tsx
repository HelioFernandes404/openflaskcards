import { AlertTriangle } from 'lucide-react'
import { Modal } from './modal'
import { Button } from './button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) onClose()
  }

  const variantStyles: Record<
    'danger' | 'warning' | 'info',
    { icon: string; buttonVariant: 'danger' | undefined; buttonClass?: string }
  > = {
    danger: { icon: 'text-danger-800', buttonVariant: 'danger' },
    warning: {
      icon: 'text-warning-600',
      buttonVariant: undefined,
      buttonClass:
        'bg-warning-50 hover:bg-warning-50 text-warning-600 border-warning-200',
    },
    info: { icon: 'text-on-surface-variant', buttonVariant: undefined },
  }

  const styles = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 ${styles.icon}`}>
            <AlertTriangle size={24} strokeWidth={1.5} />
          </div>
          <p className="text-base leading-relaxed text-on-surface-variant">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="neutral"
            className="flex-1 py-3"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={styles.buttonVariant}
            className={
              styles.buttonClass
                ? `flex-1 py-3 ${styles.buttonClass}`
                : 'flex-1 py-3'
            }
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
