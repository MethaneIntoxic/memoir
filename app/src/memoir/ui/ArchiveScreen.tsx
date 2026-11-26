import { memo, useMemo, useState, type ChangeEvent } from 'react'
import type { Memoir, Tone } from '../types.ts'
import {
  ArchiveIcon,
  FilmStripIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from './icons.tsx'

type ArchiveScreenProps = {
  archiveReady: boolean
  isEdgeAi?: boolean
  memoirs: Memoir[]
  onCreate: () => void
  onOpen: (memoir: Memoir) => void
  onPlayCinema: (memoir: Memoir) => void
  onOpenSampleRoll: () => void
  onDeleteMemoir: (memoirId: string) => void
  onClear: () => void
  onImport: (event: ChangeEvent<HTMLInputElement>) => void
}

const TONE_FILTERS: Array<{ value: 'all' | Tone; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'playful', label: 'Playful' },
  { value: 'diary', label: 'Diary' },
  { value: 'editorial', label: 'Editorial' },
]

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

function ContactSheetSpecimen({
  onOpenSampleRoll,
  isEdgeAi,
}: {
  onOpenSampleRoll: () => void
  isEdgeAi: boolean
}) {
  return (
    <div
      className="specimen-board"
      role="button"
      tabIndex={0}
      aria-label="Open interactive sample 35mm film roll"
      onClick={onOpenSampleRoll}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenSampleRoll()
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="specimen-rebate" aria-hidden="true">
        <span>MEMOIR 400 · 35MM</span>
        <span>PROOF SHEET ◀ 01A — 03A</span>
      </div>
      <div className="specimen-sprockets" aria-hidden="true">
        {Array.from({ length: 10 }, (_, idx) => (
          <span key={`top-${idx}`} />
        ))}
      </div>

      <div className="specimen-frames" aria-hidden="true">
        <div className="specimen-frame">
          <svg className="specimen-frame-art" viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sp1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#202a3b" />
                <stop offset="56%" stopColor="#b8604c" />
                <stop offset="100%" stopColor="#ebc08b" />
              </linearGradient>
            </defs>
            <rect width="160" height="200" fill="url(#sp1)" />
            <circle cx="84" cy="96" r="24" fill="#ffe1b0" opacity="0.82" />
            <path d="M0 128 Q48 112 96 124 T160 118 L160 200 L0 200 Z" fill="#171e2b" />
            <rect x="52" y="140" width="60" height="3" fill="#f3c58e" opacity="0.55" />
            <rect x="64" y="152" width="38" height="2" fill="#f3c58e" opacity="0.4" />
          </svg>
          <span className="specimen-frame-no">01A</span>
        </div>

        <div className="specimen-frame">
          <svg className="specimen-frame-art" viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sp2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#141418" />
                <stop offset="60%" stopColor="#3c1e24" />
                <stop offset="100%" stopColor="#852f31" />
              </linearGradient>
            </defs>
            <rect width="160" height="200" fill="url(#sp2)" />
            <rect x="0" y="0" width="32" height="200" fill="#0d0d10" />
            <rect x="128" y="0" width="32" height="200" fill="#0d0d10" />
            <ellipse cx="96" cy="94" rx="22" ry="30" fill="#ef684a" />
            <line x1="76" y1="84" x2="116" y2="84" stroke="#4f1714" strokeWidth="2.5" />
            <line x1="75" y1="98" x2="117" y2="98" stroke="#4f1714" strokeWidth="2.5" />
            <rect x="44" y="160" width="28" height="4" fill="#f2b279" opacity="0.45" />
            <rect x="86" y="172" width="34" height="4" fill="#ef684a" opacity="0.4" />
          </svg>
          <span className="specimen-crop-mark" />
          <span className="specimen-frame-no">02A</span>
        </div>

        <div className="specimen-frame">
          <svg className="specimen-frame-art" viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sp3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#121e2b" />
                <stop offset="55%" stopColor="#284c5e" />
                <stop offset="100%" stopColor="#6c97a0" />
              </linearGradient>
            </defs>
            <rect width="160" height="200" fill="url(#sp3)" />
            <circle cx="48" cy="82" r="18" fill="#a8e2d1" opacity="0.42" />
            <circle cx="104" cy="92" r="22" fill="#f0b47c" opacity="0.46" />
            <circle cx="76" cy="112" r="12" fill="#ffffff" opacity="0.32" />
            <rect x="8" y="12" width="144" height="148" fill="none" stroke="#0d141c" strokeWidth="18" />
            <rect x="0" y="156" width="160" height="44" fill="#0d141c" />
          </svg>
          <span className="specimen-frame-no">03A</span>
        </div>
      </div>

      <div className="specimen-sprockets" aria-hidden="true">
        {Array.from({ length: 10 }, (_, idx) => (
          <span key={`bot-${idx}`} />
        ))}
      </div>
      <div className="specimen-rebate" aria-hidden="true">
        <span>TAP STRIP · SAMPLE ROLL</span>
        <span>{isEdgeAi ? 'ZERO STORAGE' : 'LOCAL ONLY'}</span>
      </div>
    </div>
  )
}

function EmptyArchive({
  archiveReady,
  isEdgeAi,
  onCreate,
  onOpenSampleRoll,
  onImport,
}: Pick<ArchiveScreenProps, 'archiveReady' | 'onCreate' | 'onOpenSampleRoll' | 'onImport'> & { isEdgeAi: boolean }) {
  return (
    <section className="empty-archive">
      <ContactSheetSpecimen onOpenSampleRoll={onOpenSampleRoll} isEdgeAi={isEdgeAi} />

      <div className="empty-editorial">
        <div className="empty-copy">
          <p className="eyebrow">Issue 00 · Private Press</p>
          <h2>Memoirs</h2>
          <p>
            {archiveReady
              ? 'Your life, romanticized. Turn 3 to 10 candid frames into a tactile printed zine.'
              : 'Your local archive is getting ready.'}
          </p>
        </div>

        <div className="empty-actions">
          <button type="button" className="primary-button" onClick={onCreate}>
            <PlusIcon />
            <span>Create new memoir</span>
          </button>
          <div className="empty-actions-row">
            <button type="button" className="soft-button demo-roll-button" onClick={onOpenSampleRoll}>
              <FilmStripIcon />
              <span>Sample roll</span>
            </button>
            <ImportMemoirButton onImport={onImport} />
          </div>
        </div>

        <div className="empty-colophon" aria-hidden="true">
          <span>{isEdgeAi ? 'NO LOGIN' : 'NO CLOUD'}</span>
          <span>·</span>
          <span>{isEdgeAi ? 'ZERO-STORAGE EDGE AI' : 'ON-DEVICE AI'}</span>
          <span>·</span>
          <span>DARKROOM &amp; REEL EXPORT</span>
        </div>
      </div>
    </section>
  )
}

const ArchiveCard = memo(function ArchiveCard({
  memoir,
  index,
  onOpen,
  onPlayCinema,
  onDeleteMemoir,
}: {
  memoir: Memoir
  index: number
  onOpen: (memoir: Memoir) => void
  onPlayCinema: (memoir: Memoir) => void
  onDeleteMemoir: (memoirId: string) => void
}) {
  return (
    <article className="archive-card-wrap">
      <button type="button" className="archive-card" onClick={() => onOpen(memoir)}>
        <div className="archive-card-rebate">
          <span>ROLL {String(index + 1).padStart(2, '0')} · {memoir.assets.length} EXP</span>
          <span>{memoir.tone}</span>
        </div>
        <div className="archive-card-media">
          {memoir.assets[0]?.dataUrl ? (
            <img src={memoir.assets[0].dataUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="archive-image-fallback">
              <ArchiveIcon />
            </span>
          )}
        </div>
        <span className="archive-card-copy">
          <span className="eyebrow">{formatDate(memoir.createdAt)}</span>
          <strong>{memoir.title}</strong>
          <span className="archive-card-summary">{memoir.summary}</span>
        </span>
      </button>

      <div className="archive-card-footer">
        <span className="archive-card-meta">{memoir.theme.replace('-', ' ')}</span>
        <div className="archive-card-quick">
          <button
            type="button"
            className="pill-button"
            onClick={() => onPlayCinema(memoir)}
            aria-label={`Play ${memoir.title} in cinema mode`}
            title="Play cinema reel"
          >
            <PlayIcon />
            <span>Reel</span>
          </button>
          <button
            type="button"
            className="icon-button danger-button"
            onClick={() => onDeleteMemoir(memoir.id)}
            aria-label={`Delete ${memoir.title}`}
            title="Delete memoir"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </article>
  )
})

export function ArchiveScreen({
  archiveReady,
  isEdgeAi = false,
  memoirs,
  onCreate,
  onOpen,
  onPlayCinema,
  onOpenSampleRoll,
  onDeleteMemoir,
  onClear,
  onImport,
}: ArchiveScreenProps) {
  const [query, setQuery] = useState('')
  const [toneFilter, setToneFilter] = useState<'all' | Tone>('all')

  const filteredMemoirs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return memoirs.filter((memoir) => {
      if (toneFilter !== 'all' && memoir.tone !== toneFilter) {
        return false
      }
      if (!normalizedQuery) {
        return true
      }
      return (
        memoir.title.toLowerCase().includes(normalizedQuery) ||
        memoir.summary.toLowerCase().includes(normalizedQuery) ||
        memoir.notes.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [memoirs, query, toneFilter])

  if (!archiveReady || memoirs.length === 0) {
    return (
      <section className="screen archive-screen">
        <EmptyArchive
          archiveReady={archiveReady}
          isEdgeAi={isEdgeAi}
          onCreate={onCreate}
          onOpenSampleRoll={onOpenSampleRoll}
          onImport={onImport}
        />
      </section>
    )
  }

  return (
    <section className="screen archive-screen">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catalogue · {memoirs.length} {memoirs.length === 1 ? 'roll' : 'rolls'}</p>
          <h2>Saved stories</h2>
          <p className="section-subcopy">Private photo zines and contact sheets held strictly on this device.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="soft-button demo-roll-button" onClick={onOpenSampleRoll}>
            <FilmStripIcon />
            <span>Sample roll</span>
          </button>
          <ImportMemoirButton onImport={onImport} />
          <button type="button" className="soft-button danger-button" onClick={onClear}>
            <TrashIcon />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {memoirs.length >= 2 ? (
        <div className="archive-filter-bar">
          <label className="archive-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search catalogue..."
              aria-label="Search saved memoirs"
            />
          </label>
          <div className="archive-tone-pills" role="group" aria-label="Filter by tone">
            {TONE_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={toneFilter === option.value ? 'pill-button is-active' : 'pill-button'}
                onClick={() => setToneFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {filteredMemoirs.length === 0 ? (
        <div className="compose-panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p>No saved memoirs match that filter.</p>
          <div>
            <button
              type="button"
              className="soft-button compact-button"
              onClick={() => {
                setQuery('')
                setToneFilter('all')
              }}
            >
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="archive-list">
          {filteredMemoirs.map((memoir, index) => (
            <ArchiveCard
              key={memoir.id}
              memoir={memoir}
              index={index}
              onOpen={onOpen}
              onPlayCinema={onPlayCinema}
              onDeleteMemoir={onDeleteMemoir}
            />
          ))}
        </div>
      )}
    </section>
  )
}
