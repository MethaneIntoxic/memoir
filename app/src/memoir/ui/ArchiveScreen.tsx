import type { ChangeEvent } from 'react'
import type { Memoir } from '../types.ts'
import { ArchiveIcon, PlusIcon, TrashIcon, UploadIcon } from './icons.tsx'

type ArchiveScreenProps = {
  archiveReady: boolean
  memoirs: Memoir[]
  onCreate: () => void
  onOpen: (memoir: Memoir) => void
  onClear: () => void
  onImport: (event: ChangeEvent<HTMLInputElement>) => void
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Saved memoir'
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function ImportMemoirButton({ onImport }: Pick<ArchiveScreenProps, 'onImport'>) {
  return (
    <label className="soft-button file-action">
      <UploadIcon />
      <span>Import</span>
      <input type="file" accept=".memoir,application/vnd.memoir+zip" onChange={onImport} />
    </label>
  )
}

function EmptyArchive({ archiveReady, onCreate, onImport }: Pick<ArchiveScreenProps, 'archiveReady' | 'onCreate' | 'onImport'>) {
  return (
    <section className="empty-archive">
      <div className="keepsake-stack" aria-hidden="true">
        <div className="empty-photo-frame">
          <img src="/icons/memoir-icon-192.png" alt="" />
        </div>
      </div>
      <div className="empty-copy">
        <h2>Memoirs</h2>
        <p>{archiveReady ? 'Your life, romanticized. Start your first memoir.' : 'Your local archive is getting ready.'}</p>
      </div>
      <div className="empty-actions">
        <button type="button" className="primary-button" onClick={onCreate}>
          <PlusIcon />
          <span>Create new memoir</span>
        </button>
        <ImportMemoirButton onImport={onImport} />
      </div>
    </section>
  )
}

export function ArchiveScreen({ archiveReady, memoirs, onCreate, onOpen, onClear, onImport }: ArchiveScreenProps) {
  if (!archiveReady || memoirs.length === 0) {
    return (
      <section className="screen archive-screen">
        <EmptyArchive archiveReady={archiveReady} onCreate={onCreate} onImport={onImport} />
      </section>
    )
  }

  return (
    <section className="screen archive-screen">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Archive</p>
          <h2>Saved stories</h2>
          <p className="section-subcopy">Curated moments and visual stories from your archive.</p>
        </div>
        <div className="heading-actions">
          <ImportMemoirButton onImport={onImport} />
          <button type="button" className="soft-button danger-button" onClick={onClear}>
            <TrashIcon />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="archive-list">
        {memoirs.map((memoir) => (
          <button key={memoir.id} type="button" className="archive-card" onClick={() => onOpen(memoir)}>
            {memoir.assets[0]?.dataUrl ? (
              <img src={memoir.assets[0].dataUrl} alt="" />
            ) : (
              <span className="archive-image-fallback">
                <ArchiveIcon />
              </span>
            )}
            <span className="archive-card-copy">
              <span className="eyebrow">{formatDate(memoir.createdAt)}</span>
              <strong>{memoir.title}</strong>
              <span>{memoir.summary}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
