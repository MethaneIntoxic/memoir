import { useEffect, useRef, useState } from 'react'
import {
  BookOpenIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  FileTextIcon,
  ImagesSquareIcon,
  XIcon,
} from '@phosphor-icons/react'

type ShareAction = 'pdf' | 'web' | 'portable' | 'slides'

type ShareExportDialogProps = {
  memoirTitle: string
  onClose: () => void
  onPrintPdf: () => void | Promise<void>
  onExportHtml: () => void | Promise<void>
  onExportPortable: () => void | Promise<void>
  onExportSlides: () => void | Promise<void>
}

const actionLabels: Record<ShareAction, string> = {
  pdf: 'Print preview opened',
  web: 'Web memoir exported',
  portable: 'Portable memoir exported',
  slides: '4:5 slides exported',
}

function friendlyExportError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('invalid-portable-memoir-asset')) {
    return 'One of this memoir’s photos could not be packaged. Re-import that photo and try again.'
  }
  if (message.includes('canvas') || message.includes('image')) {
    return 'A photo could not be rendered for export. Re-import it and try again.'
  }
  return 'Export failed. Your memoir is still safe; please try again.'
}

export function ShareExportDialog({
  memoirTitle,
  onClose,
  onPrintPdf,
  onExportHtml,
  onExportPortable,
  onExportSlides,
}: ShareExportDialogProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const [busyAction, setBusyAction] = useState<ShareAction | null>(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyAction) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busyAction, onClose])

  async function runAction(action: ShareAction, callback: () => void | Promise<void>) {
    setBusyAction(action)
    setMessage('')
    setIsError(false)
    try {
      await callback()
      setMessage(actionLabels[action])
    } catch (error) {
      setIsError(true)
      setMessage(friendlyExportError(error))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="dialog-backdrop">
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        aria-describedby="share-dialog-description"
      >
        <button
          ref={closeButton}
          type="button"
          className="dialog-close"
          onClick={onClose}
          disabled={busyAction !== null}
          aria-label="Close share and export"
        >
          <XIcon aria-hidden="true" />
        </button>
        <div className="share-dialog-heading">
          <p className="eyebrow">{memoirTitle}</p>
          <h2 id="share-dialog-title">Distribute</h2>
          <p id="share-dialog-description">Choose how you would like to keep or share this completed memoir.</p>
        </div>

        <div className="share-options">
          <button type="button" onClick={() => void runAction('pdf', onPrintPdf)} disabled={busyAction !== null}>
            <FilePdfIcon weight="fill" aria-hidden="true" />
            <span>{busyAction === 'pdf' ? 'Opening print preview…' : 'Save as PDF'}</span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void runAction('web', onExportHtml)} disabled={busyAction !== null}>
            <FileTextIcon weight="fill" aria-hidden="true" />
            <span>{busyAction === 'web' ? 'Preparing web memoir…' : 'Export web memoir'}</span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void runAction('portable', onExportPortable)} disabled={busyAction !== null}>
            <BookOpenIcon weight="fill" aria-hidden="true" />
            <span>{busyAction === 'portable' ? 'Packing memoir…' : 'Export portable .memoir'}</span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>
          <button className="is-primary" type="button" onClick={() => void runAction('slides', onExportSlides)} disabled={busyAction !== null}>
            <ImagesSquareIcon weight="fill" aria-hidden="true" />
            <span>{busyAction === 'slides' ? 'Rendering 4:5 slides…' : 'Export 4:5 slides'}</span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>
        </div>

        {message ? <p className={isError ? 'dialog-message is-error' : 'dialog-message'} role="status">{message}</p> : null}
      </section>
    </div>
  )
}
