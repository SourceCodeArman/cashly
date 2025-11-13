/**
 * ConfirmDeleteModal
 */
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  isDeleting?: boolean
  confirmVariant?: 'danger' | 'primary' | 'success' | 'secondary'
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDeleting,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            {cancelText}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} isLoading={isDeleting} fullWidth>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}


