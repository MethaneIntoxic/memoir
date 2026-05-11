import type { ReactNode } from 'react'
import { ArchiveIcon, BookIcon, MenuIcon, PlusIcon, SparkleIcon } from './icons.tsx'
import { StatusLine } from './StatusLine.tsx'

type MemoirShellProps = {
  view: 'archive' | 'compose' | 'editor'
  themeClass: string
  health: string
  stage: string
  onArchive: () => void
  onCreate: () => void
  children: ReactNode
}

export function MemoirShell({ view, themeClass, health, stage, onArchive, onCreate, children }: MemoirShellProps) {
  return (
    <main className={`app view-${view} ${themeClass}`}>
      <header className="topbar">
        <button type="button" className="top-icon-button" onClick={onArchive} aria-label="Open archive">
          <MenuIcon />
        </button>
        <div className="brand-lockup">
          <h1>Memoir</h1>
        </div>
        <div className="topbar-actions">
          <StatusLine health={health} stage={stage} />
          <button type="button" className="top-icon-button" onClick={onCreate} aria-label="Create memoir">
            <PlusIcon />
          </button>
        </div>
      </header>

      {children}

      <nav className="bottom-nav" aria-label="Primary">
        <button type="button" onClick={onArchive} aria-current={view === 'archive' ? 'page' : undefined}>
          <ArchiveIcon />
          <span>Archive</span>
        </button>
        <button type="button" onClick={onCreate} aria-current={view === 'compose' ? 'page' : undefined}>
          <SparkleIcon />
          <span>Create</span>
        </button>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-current={view === 'editor' ? 'page' : undefined}>
          <BookIcon />
          <span>Story</span>
        </button>
      </nav>
    </main>
  )
}
