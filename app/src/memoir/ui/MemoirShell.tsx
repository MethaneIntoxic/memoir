import type { ReactNode } from 'react'
import { UserCircleIcon } from '@phosphor-icons/react'
import { ArchiveIcon, BookIcon, MenuIcon, PlusIcon, SparkleIcon } from './icons.tsx'
import { StatusLine } from './StatusLine.tsx'

type MemoirShellProps = {
  view: 'archive' | 'compose' | 'reader' | 'editor' | 'settings'
  themeClass: string
  health: string
  stage: string
  isModalOpen: boolean
  onArchive: () => void
  onCreate: () => void
  onStory: () => void
  onSettings: () => void
  children: ReactNode
}

export function MemoirShell({ view, themeClass, health, stage, isModalOpen, onArchive, onCreate, onStory, onSettings, children }: MemoirShellProps) {
  return (
    <main className={`app view-${view} ${themeClass}`} inert={isModalOpen ? true : undefined} aria-hidden={isModalOpen ? true : undefined}>
      <header className="topbar">
        <button type="button" className="top-icon-button" onClick={onArchive} aria-label="Open archive">
          <MenuIcon />
        </button>
        <div className="brand-lockup">
          <h1>Memoir</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="top-icon-button" onClick={onCreate} aria-label="Create memoir">
            <PlusIcon />
          </button>
        </div>
      </header>

      <StatusLine health={health} stage={stage} />

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
        <button type="button" onClick={onStory} aria-current={view === 'reader' || view === 'editor' ? 'page' : undefined}>
          <BookIcon />
          <span>Story</span>
        </button>
        <button type="button" onClick={onSettings} aria-current={view === 'settings' ? 'page' : undefined}>
          <UserCircleIcon aria-hidden="true" />
          <span>Settings</span>
        </button>
      </nav>
    </main>
  )
}
