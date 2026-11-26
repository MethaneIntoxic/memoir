import type { ReactNode } from 'react'
import type { Theme } from '../types.ts'
import {
  ArrowRightIcon,
  BookOpenIcon,
  CpuIcon,
  DownloadSimpleIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SparkleIcon,
  UserCircleIcon,
} from './icons.tsx'

type SettingsScreenProps = {
  health: string
  isEdgeAi?: boolean
  memoirCount: number
  theme: Theme
  hasDraft: boolean
  defaultDarkroom: boolean
  onRefreshHealth: () => void
  onThemeChange: (theme: Theme) => void
  onToggleDefaultDarkroom: () => void
  onOpenExports: () => void
  onExportDiagnostics: () => void
  onRequestClearArchive: () => void
}

const themeOrder: Theme[] = ['soft-archive', 'noir-journal', 'film-notes']

const themeOptions: Array<{ value: Theme; label: string; hint: string; dots: [string, string, string] }> = [
  { value: 'soft-archive', label: 'Riso paper', hint: 'newsprint & vermilion', dots: ['#f4f0e8', '#151311', '#c43627'] },
  { value: 'noir-journal', label: 'Carbon lab', hint: 'darkroom & safelight', dots: ['#0f0f0d', '#ebe5d9', '#e45c33'] },
  { value: 'film-notes', label: 'Cyanotype', hint: 'blueprint & ochre', dots: ['#edf1f5', '#0f2342', '#b8661e'] },
]

const themeLabels: Record<Theme, string> = {
  'noir-journal': 'Carbon lab',
  'soft-archive': 'Riso paper',
  'film-notes': 'Cyanotype',
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
    <button
      type="button"
      className={danger ? 'settings-row is-danger' : 'settings-row'}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  )
}

export function SettingsScreen({
  health,
  isEdgeAi = false,
  memoirCount,
  theme,
  hasDraft,
  defaultDarkroom,
  onRefreshHealth,
  onThemeChange,
  onToggleDefaultDarkroom,
  onOpenExports,
  onExportDiagnostics,
  onRequestClearArchive,
}: SettingsScreenProps) {
  const nextTheme = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length] ?? 'soft-archive'

  return (
    <section className="screen settings-screen">
      <section className="settings-profile" aria-labelledby="settings-title">
        <span className="settings-avatar" aria-hidden="true">
          <UserCircleIcon />
        </span>
        <h2 id="settings-title">Your private memoir</h2>
        <p>
          {isEdgeAi
            ? 'Your archive stays in this browser. Photos pass ephemerally through edge AI and are never stored.'
            : 'Curating the everyday, entirely on this device.'}
        </p>
      </section>

      <div className="settings-groups">
        <section className="settings-group" aria-labelledby="device-settings-title">
          <h3 id="device-settings-title">{isEdgeAi ? 'AI & Privacy' : 'On-device'}</h3>
          <SettingRow
            icon={<CpuIcon aria-hidden="true" />}
            label={isEdgeAi ? 'Edge AI status' : 'Local AI status'}
            value="Refresh"
            onClick={onRefreshHealth}
          />
          <p className="settings-detail" role="status">{health}</p>
          <SettingRow
            icon={<ShieldCheckIcon aria-hidden="true" />}
            label="Privacy"
            value={isEdgeAi ? 'Zero storage' : 'Local only'}
          />
        </section>

        <section className="settings-group" aria-labelledby="appearance-settings-title">
          <h3 id="appearance-settings-title">Aesthetics &amp; rituals</h3>
          <SettingRow
            icon={<PaletteIcon aria-hidden="true" />}
            label="Theme & layout"
            value={themeLabels[theme]}
            onClick={() => onThemeChange(nextTheme)}
          />
          <div className="theme-row theme-row-3" role="group" aria-label="Choose visual film stock">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === theme ? 'tone-button is-active' : 'tone-button'}
                onClick={() => onThemeChange(option.value)}
              >
                <span className="theme-swatch-dots" aria-hidden="true">
                  {option.dots.map((dot) => (
                    <i key={dot} style={{ backgroundColor: dot }} />
                  ))}
                </span>
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
          <SettingRow
            icon={<SparkleIcon aria-hidden="true" />}
            label="Open stories in Darkroom Develop tray"
            value={defaultDarkroom ? 'On' : 'Off'}
            onClick={onToggleDefaultDarkroom}
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
