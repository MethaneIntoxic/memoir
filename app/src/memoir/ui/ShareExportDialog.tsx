import { useEffect, useRef, useState } from 'react'
import {
  BookOpenIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  FileTextIcon,
  GridIcon,
  ImagesSquareIcon,
  VideoIcon,
  XIcon,
} from './icons.tsx'

type ShareAction = 'pdf' | 'web' | 'portable' | 'slides' | 'poster' | 'reel'

type ShareExportDialogProps = {
  memoirTitle: string
  includeExportStamp: boolean
  onToggleExportStamp: () => void
  onClose: () => void
  onPrintPdf: () => void | Promise<void>
  onExportHtml: () => void | Promise<void>
  onExportPortable: () => void | Promise<void>
  onExportSlides: () => void | Promise<void>
  onExportPoster: () => void | Promise<void>
  onExportReel: (onProgress?: (pct: number) => void) => void | Promise<void>
}

const actionLabels: Record<ShareAction, string> = {
  pdf: 'Print or share opened',
  web: 'Interactive web zine exported',
  portable: 'Portable memoir exported',
  slides: 'Social carousel prepared',
  poster: 'Contact sheet poster saved',
  reel: 'Cinema story reel (.webm) exported',
}

function friendlyExportError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('invalid-portable-memoir-asset')) {
    return 'One of this memoir’s photos could not be packaged. Re-import that photo and try again.'
  }
  if (message === 'cinema-reel-unsupported') {
    return 'This browser does not support local video reel recording. Try the Contact Sheet Poster or Carousel instead.'
  }
  if (message.includes('canvas') || message.includes('image')) {
    return 'A photo could not be rendered for export. Re-import it and try again.'
  }
  if (message.startsWith('native-export-')) {
    return 'The system share sheet could not open. Your memoir is still safe; please try again.'
  }
  return 'Export failed. Your memoir is still safe; please try again.'
}

export function ShareExportDialog({
  memoirTitle,
  includeExportStamp,
  onToggleExportStamp,
  onClose,
  onPrintPdf,
  onExportHtml,
  onExportPortable,
  onExportSlides,
  onExportPoster,
  onExportReel,
}: ShareExportDialogProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const [busyAction, setBusyAction] = useState<ShareAction | null>(null)
  const [reelPct, setReelPct] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyAction) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busyAction, onClose])

  async function runAction(action: ShareAction, callback: () => void | Promise<void>) {
    setBusyAction(action)
    setReelPct(0)
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
          <p className="eyebrow">PRINT LAB · ORDER SLIP · {memoirTitle}</p>
          <h2 id="share-dialog-title">Ready to press</h2>
          <p id="share-dialog-description">
            Select an archival print format—4:5 social slides, contact sheet poster, cinema reel, or offline interactive HTML zine.
          </p>
        </div>

        <label className="share-stamp-toggle">
          <input
            type="checkbox"
            checked={includeExportStamp}
            onChange={onToggleExportStamp}
            disabled={busyAction !== null}
          />
          <span className="share-stamp-copy">
            <strong>Film-edge rebate stamp</strong>
            <small>MEMOIR 400 · memoir.memoir-press.workers.dev</small>
          </span>
        </label>

        <div className="share-options">
          <button
            className="is-primary"
            type="button"
            onClick={() => void runAction('slides', onExportSlides)}
            disabled={busyAction !== null}
          >
            <span className="share-option-index">01</span>
            <ImagesSquareIcon aria-hidden="true" />
            <span className="share-option-copy">
              <strong>{busyAction === 'slides' ? 'Preparing social carousel...' : 'Instagram / TikTok carousel'}</strong>
              <small>1080×1350 PNG SET · FILM REBATE + COLOR DNA</small>
            </span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>

          <button
            className="is-viral"
            type="button"
            onClick={() => void runAction('poster', onExportPoster)}
            disabled={busyAction !== null}
          >
            <span className="share-option-index">02</span>
            <GridIcon aria-hidden="true" />
            <span className="share-option-copy">
              <strong>{busyAction === 'poster' ? 'Rendering contact sheet…' : 'Contact sheet poster (.png)'}</strong>
              <small>SINGLE 4:5 PRINT · ALL FRAMES + PIGMENT BAR</small>
            </span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>

          <button
            className="is-viral"
            type="button"
            onClick={() => void runAction('reel', () => onExportReel(setReelPct))}
            disabled={busyAction !== null}
          >
            <span className="share-option-index">03</span>
            <VideoIcon aria-hidden="true" />
            <span className="share-option-copy">
              <strong>
                {busyAction === 'reel' ? `Rendering cinema reel (${reelPct}%)…` : 'Cinema story reel (.webm)'}
              </strong>
              <small>LOCAL KEN BURNS VIDEO · READY FOR REELS / TIKTOK</small>
            </span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>

          <button type="button" onClick={() => void runAction('web', onExportHtml)} disabled={busyAction !== null}>
            <span className="share-option-index">04</span>
            <FileTextIcon aria-hidden="true" />
            <span className="share-option-copy">
              <strong>{busyAction === 'web' ? 'Preparing web memoir…' : 'Interactive HTML zine'}</strong>
              <small>STANDALONE FILE · 3D FLIP + DARKROOM REVEAL</small>
            </span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>

          <button type="button" onClick={() => void runAction('portable', onExportPortable)} disabled={busyAction !== null}>
            <span className="share-option-index">05</span>
            <BookOpenIcon aria-hidden="true" />
            <span className="share-option-copy">
              <strong>{busyAction === 'portable' ? 'Packing memoir…' : 'Export portable .memoir'}</strong>
              <small>RE-IMPORTABLE ZIP ARCHIVE</small>
            </span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>

          <button type="button" onClick={() => void runAction('pdf', onPrintPdf)} disabled={busyAction !== null}>
            <span className="share-option-index">06</span>
            <FilePdfIcon aria-hidden="true" />
            <span className="share-option-copy">
              <strong>{busyAction === 'pdf' ? 'Opening print or share…' : 'Print / Save as PDF'}</strong>
              <small>PRESS-READY BROADSHEET LAYOUT</small>
            </span>
            <DownloadSimpleIcon aria-hidden="true" />
          </button>
        </div>

        {message ? (
          <p className={isError ? 'dialog-message is-error' : 'dialog-message'} role="status">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  )
}
