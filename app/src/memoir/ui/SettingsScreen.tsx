import {
  ArrowRightIcon,
  BookOpenIcon,
  CpuIcon,
  DownloadSimpleIcon,
  PaletteIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { Theme } from '../types.ts'

type SettingsScreenProps = {
  health: string
  memoirCount: number
  theme: Theme
  hasDraft: boolean
  onRefreshHealth: () => void
  onThemeChange: (theme: Theme) => void
  onOpenExports: () => void
  onExportDiagnostics: () => void
  onRequestClearArchive: () => void
}

const themeOrder: Theme[] = ['noir-journal', 'soft-archive', 'film-notes']

const themeLabels: Record<Theme, string> = {
  'noir-journal': 'Noir journal',
  'soft-archive': 'Soft archive',
  'film-notes': 'Film notes',
}

function SettingRow({
  icon,
  label,
  value,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: ReactNode
  label: string
  value?: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
}) {
  const content = (
    <>
      <span className="settings-row-icon">{icon}</span>
      <span className="settings-row-label">{label}</span>
      {value ? <span className="settings-row-value">{value}</span> : onClick ? <ArrowRightIcon aria-hidden="true" /> : null}
    </>
  )

  if (!onClick) {
    return <div className={danger ? 'settings-row is-danger' : 'settings-row'}>{content}</div>
  }

  return (
    <button type="button" className={danger ? 'settings-row is-danger' : 'settings-row'} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}

export function SettingsScreen({
  health,
  memoirCount,
  theme,
  hasDraft,
  onRefreshHealth,
  onThemeChange,
  onOpenExports,
  onExportDiagnostics,
  onRequestClearArchive,
}: SettingsScreenProps) {
  const nextTheme = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length] ?? 'noir-journal'

  return (
    <section className="screen settings-screen">
      <section className="settings-profile" aria-labelledby="settings-title">
        <span className="settings-avatar" aria-hidden="true">
          <UserCircleIcon weight="thin" />
        </span>
        <h2 id="settings-title">Your private memoir</h2>
        <p>Curating the everyday, entirely on this device.</p>
      </section>

      <div className="settings-groups">
        <section className="settings-group" aria-labelledby="device-settings-title">
          <h3 id="device-settings-title">On-device</h3>
          <SettingRow
            icon={<CpuIcon aria-hidden="true" />}
            label="Local AI status"
            value="Refresh"
            onClick={onRefreshHealth}
          />
          <p className="settings-detail" role="status">{health}</p>
          <SettingRow
            icon={<ShieldCheckIcon aria-hidden="true" />}
            label="Privacy"
            value="Local only"
          />
        </section>

        <section className="settings-group" aria-labelledby="appearance-settings-title">
          <h3 id="appearance-settings-title">Aesthetics</h3>
          <SettingRow
            icon={<PaletteIcon aria-hidden="true" />}
            label="Theme & layout"
            value={themeLabels[theme]}
            onClick={() => onThemeChange(nextTheme)}
          />
        </section>

        <section className="settings-group" aria-labelledby="archive-settings-title">
          <h3 id="archive-settings-title">Archive</h3>
          <SettingRow
            icon={<BookOpenIcon aria-hidden="true" />}
            label="Saved memoirs"
            value={`${memoirCount}`}
          />
          <SettingRow
            icon={<DownloadSimpleIcon aria-hidden="true" />}
            label="Share & export current memoir"
            onClick={onOpenExports}
            disabled={!hasDraft}
          />
          <SettingRow
            icon={<DownloadSimpleIcon aria-hidden="true" />}
            label="Export local diagnostics"
            onClick={onExportDiagnostics}
            disabled={!hasDraft}
          />
        </section>

        <button
          type="button"
          className="settings-clear-button"
          onClick={onRequestClearArchive}
          disabled={memoirCount === 0}
        >
          Clear local archive
        </button>
      </div>
    </section>
  )
}
