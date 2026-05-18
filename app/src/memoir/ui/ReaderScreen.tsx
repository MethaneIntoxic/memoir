import { buildMemoirSlides } from '../../../../packages/memoir-core/index.mjs'
import type { Memoir } from '../types.ts'
import { ArrowLeftIcon, DownloadIcon, EditIcon, ExportIcon, SaveIcon } from './icons.tsx'

type ReaderScreenProps = {
  draft: Memoir
  onArchive: () => void
  onEdit: () => void
  onSave: () => void
  onExportHtml: () => void
  onExportInstagram: () => void
}

export function ReaderScreen({
  draft,
  onArchive,
  onEdit,
  onSave,
  onExportHtml,
  onExportInstagram,
}: ReaderScreenProps) {
  const slides = buildMemoirSlides(draft)

  return (
    <section className="screen reader-screen">
      <div className="reader-toolbar">
        <button type="button" className="soft-button compact-button" onClick={onArchive}>
          <ArrowLeftIcon />
          <span>Archive</span>
        </button>
        <p className="save-state">Swipe chapters</p>
        <button type="button" className="soft-button compact-button" onClick={onEdit}>
          <EditIcon />
          <span>Edit</span>
        </button>
      </div>

      <section className="reader-cover">
        <p className="eyebrow">{new Date(draft.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
        <h2>{draft.title}</h2>
        <p>{draft.summary}</p>
      </section>

      <div className="reader-track" aria-label={`${slides.length} memoir carousel slides`}>
        {slides.map((slide) => (
          <article key={slide.id} className="reader-slide">
            <div className="reader-slide-media">
              <img src={slide.asset.dataUrl} alt="" />
              <span>
                {slide.index}/{slide.count}
              </span>
            </div>
            <div className="reader-slide-copy">
              <h3>{slide.rawCaption}</h3>
              <p>{slide.rawBody}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="reader-actions">
        <button type="button" className="primary-button" onClick={onExportInstagram}>
          <DownloadIcon />
          <span>Export 4:5 slides</span>
        </button>
        <button type="button" className="soft-button" onClick={onSave}>
          <SaveIcon />
          <span>Save</span>
        </button>
        <button type="button" className="soft-button" onClick={onExportHtml}>
          <ExportIcon />
          <span>Web memoir</span>
        </button>
      </div>
    </section>
  )
}
