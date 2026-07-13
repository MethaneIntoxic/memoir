import { TrashIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'

type ConfirmClearDialogProps = {
  memoirCount: number
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmClearDialog({ memoirCount, onCancel, onConfirm }: ConfirmClearDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="dialog-backdrop">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-dialog-title" aria-describedby="clear-dialog-description">
        <button type="button" className="dialog-close" onClick={onCancel} aria-label="Cancel clearing archive">
          <XIcon aria-hidden="true" />
        </button>
        <WarningCircleIcon className="confirm-dialog-icon" weight="thin" aria-hidden="true" />
        <h2 id="clear-dialog-title">Clear local archive?</h2>
        <p id="clear-dialog-description">
          {memoirCount === 1
            ? 'This permanently removes 1 memoir and its saved photos from this device.'
            : `This permanently removes ${memoirCount} memoirs and their saved photos from this device.`}
        </p>
        <div className="confirm-dialog-actions">
          <button ref={cancelButton} type="button" className="soft-button" onClick={onCancel}>Keep memoirs</button>
          <button type="button" className="primary-button danger-primary" onClick={onConfirm}>
            <TrashIcon aria-hidden="true" />
            <span>Clear archive</span>
          </button>
        </div>
      </section>
    </div>
  )
}
