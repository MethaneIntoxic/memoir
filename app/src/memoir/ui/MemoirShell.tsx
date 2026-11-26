import type { CSSProperties, ReactNode } from 'react'
import type { Theme } from '../types.ts'
import {
  ArchiveIcon,
  BookIcon,
  FilmStripIcon,
  MenuIcon,
  MoonIcon,
  PlusIcon,
  SparkleIcon,
  SunIcon,
  UserCircleIcon,
} from './icons.tsx'
import { StatusLine } from './StatusLine.tsx'

type MemoirShellProps = {
  view: 'archive' | 'compose' | 'reader' | 'editor' | 'settings'
  theme: Theme
  themeClass: string
  ambientA?: string
  ambientB?: string
  health: string
  stage: string
  isModalOpen: boolean
  onCycleTheme: () => void
  onArchive: () => void
  onCreate: () => void
  onStory: () => void
  onSettings: () => void
  children: ReactNode
}

function ThemeModeIcon({ theme }: { theme: Theme }) {
  if (theme === 'noir-journal') return <MoonIcon />
  if (theme === 'film-notes') return <FilmStripIcon />
  return <SunIcon />
}

const THEME_BADGE: Record<Theme, string> = {
  'soft-archive': 'RISO PAPER',
  'noir-journal': 'CARBON LAB',
  'film-notes': 'CYANOTYPE',
}

export function MemoirShell({
  view,
  theme,
  themeClass,
  ambientA,
  ambientB,
  health,
  stage,
  isModalOpen,
  onCycleTheme,
  onArchive,
  onCreate,
  onStory,
  onSettings,
  children,
}: MemoirShellProps) {
  const stageStyle = {
    ...(ambientA ? { '--ambient-a': ambientA } : {}),
    ...(ambientB ? { '--ambient-b': ambientB } : {}),
  } as CSSProperties

  return (
    <div className={`app-stage ${themeClass}`} style={stageStyle}>
      <main
        className={`app view-${view} ${themeClass}`}
        inert={isModalOpen ? true : undefined}
        aria-hidden={isModalOpen ? true : undefined}
      >
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="top-icon-button" onClick={onArchive} aria-label="Open archive">
              <MenuIcon />
            </button>
            <span className="topbar-edition" aria-hidden="true">VOL. 01</span>
          </div>
          <div className="brand-lockup">
            <h1>Memoir</h1>
            <span className="brand-tag" aria-hidden="true">{THEME_BADGE[theme]}</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="top-icon-button"
              onClick={onCycleTheme}
              aria-label={`Switch visual film stock (current: ${theme})`}
              title="Switch paper / darkroom stock"
            >
              <ThemeModeIcon theme={theme} />
            </button>
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
    </div>
  )
}
