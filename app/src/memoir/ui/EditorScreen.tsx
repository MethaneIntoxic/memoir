import { memo } from 'react'
import type { Asset, Memoir, Theme } from '../types.ts'
import {
  ArrowLeftIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  ImageIcon,
  MoreIcon,
  SaveIcon,
} from './icons.tsx'

type SectionField = 'caption' | 'body'

type EditorScreenProps = {
  draft: Memoir
  currentAssetMap: Map<string, Asset>
  busySection: string
  hasUnsavedChanges: boolean
  showDebugUi: boolean
  onArchive: () => void
  onPreviewReader: () => void
  onTitleChange: (title: string) => void
  onSummaryChange: (summary: string) => void
  onQuoteChange: (quote: string) => void
  onThemeChange: (theme: Theme) => void
  onSectionChange: (sectionId: string, field: SectionField, value: string) => void
  onRewriteSection: (sectionId: string, field: SectionField) => void
  onMoveSection: (sectionId: string, direction: -1 | 1) => void
  onSave: () => void
  onShare: () => void
  onDiagnostics: () => void
}

const themeOptions: Array<{ value: Theme; label: string; hint: string; dots: [string, string, string] }> = [
  { value: 'soft-archive', label: 'Riso paper', hint: 'newsprint & vermilion', dots: ['#f4f0e8', '#151311', '#c43627'] },
  { value: 'noir-journal', label: 'Carbon lab', hint: 'darkroom & safelight', dots: ['#0f0f0d', '#ebe5d9', '#e45c33'] },
  { value: 'film-notes', label: 'Cyanotype', hint: 'blueprint & ochre', dots: ['#edf1f5', '#0f2342', '#b8661e'] },
]

const StoryCard = memo(function StoryCard({
  sectionCount,
  asset,
  section,
  index,
  busySection,
  onSectionChange,
  onRewriteSection,
  onMoveSection,
}: Pick<EditorScreenProps, 'busySection' | 'onSectionChange' | 'onRewriteSection' | 'onMoveSection'> & {
  sectionCount: number
  asset: Asset | undefined
  section: Memoir['sections'][number]
  index: number
}) {
  const isBusy = busySection === section.id

  return (
    <article className="story-card">
      <div className="story-card-media">
        {asset ? (
          <img src={asset.dataUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="image-fallback">
            <ImageIcon />
          </span>
        )}
        <span className="chapter-number">{index + 1}</span>
      </div>
      <textarea
        className="caption-input"
        aria-label={`Chapter ${index + 1} caption`}
        value={section.caption}
        rows={2}
        onChange={(event) => onSectionChange(section.id, 'caption', event.target.value)}
      />
      <textarea
        className="body-input"
        aria-label={`Chapter ${index + 1} body`}
        value={section.body}
        rows={5}
        onChange={(event) => onSectionChange(section.id, 'body', event.target.value)}
      />
      <div className="card-actions">
        <button
          type="button"
          className="icon-button"
          disabled={isBusy}
          onClick={() => onRewriteSection(section.id, 'caption')}
          aria-label={`Polish chapter ${index + 1} caption`}
          title="Polish caption with local AI"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onMoveSection(section.id, -1)}
          disabled={index === 0}
          aria-label={`Move chapter ${index + 1} left`}
          title="Move earlier"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onMoveSection(section.id, 1)}
          disabled={index === sectionCount - 1}
          aria-label={`Move chapter ${index + 1} right`}
          title="Move later"
        >
          <ArrowLeftIcon className="move-right-icon" />
        </button>
        <button
          type="button"
          className="icon-button"
          disabled={isBusy}
          onClick={() => onRewriteSection(section.id, 'body')}
          aria-label={`Polish chapter ${index + 1} body`}
          title="Polish reflection with local AI"
        >
          <MoreIcon />
        </button>
      </div>
    </article>
  )
})

export function EditorScreen({
  draft,
  currentAssetMap,
  busySection,
  hasUnsavedChanges,
  showDebugUi,
  onArchive,
  onPreviewReader,
  onTitleChange,
  onSummaryChange,
  onQuoteChange,
  onThemeChange,
  onSectionChange,
  onRewriteSection,
  onMoveSection,
  onSave,
  onShare,
  onDiagnostics,
}: EditorScreenProps) {
  return (
    <section className="screen editor-screen">
      <div className="editor-main">
        <div className="editor-toolbar">
          <div className="reader-toolbar-group">
            <button type="button" className="soft-button compact-button" onClick={onArchive}>
              <ArrowLeftIcon />
              <span>Archive</span>
            </button>
            <button type="button" className="soft-button compact-button" onClick={onPreviewReader}>
              <EyeIcon />
              <span>Preview reader</span>
            </button>
          </div>
          {hasUnsavedChanges ? (
            <span className="unsaved-badge">Unsaved edits</span>
          ) : (
            <p className="save-state">Editable storyboard</p>
          )}
        </div>

        <section className="memoir-cover">
          <div className="cover-copy">
            <p className="eyebrow">
              {new Date(draft.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} · {draft.tone}
            </p>
            <textarea
              className="title-input"
              aria-label="Memoir title"
              value={draft.title}
              rows={4}
              onChange={(event) => onTitleChange(event.target.value)}
            />
            <textarea
              className="summary-input"
              aria-label="Memoir summary"
              value={draft.summary}
              rows={3}
              onChange={(event) => onSummaryChange(event.target.value)}
            />
          </div>
          {draft.assets[0]?.dataUrl ? (
            <img className="cover-image" src={draft.assets[0].dataUrl} alt="" decoding="async" />
          ) : null}
        </section>

        <section className="quote-panel">
          <textarea
            aria-label="Memoir quote"
            value={draft.quote}
            rows={2}
            onChange={(event) => onQuoteChange(event.target.value)}
          />
        </section>

        <div className="theme-row theme-row-3" role="group" aria-label="Memoir visual theme">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === draft.theme ? 'tone-button is-active' : 'tone-button'}
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

        <section className="storyboard-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Story map</p>
              <h2>Chapters</h2>
            </div>
            <p>{draft.sections.length} beats</p>
          </div>
          <div className="storyboard-track">
            {draft.sections.map((section, index) => (
              <StoryCard
                key={section.id}
                sectionCount={draft.sections.length}
                asset={currentAssetMap.get(section.assetId)}
                section={section}
                index={index}
                busySection={busySection}
                onSectionChange={onSectionChange}
                onRewriteSection={onRewriteSection}
                onMoveSection={onMoveSection}
              />
            ))}
          </div>
        </section>
      </div>

      <aside className="editor-sidebar">
        <h3>Keep this memoir</h3>
        <p className="editor-sidebar-copy">
          Save it locally or export as a carousel, contact sheet poster, cinema video reel, or interactive HTML zine.
        </p>
        <div className="editor-actions">
          <button type="button" className="primary-button" onClick={onSave}>
            <SaveIcon />
            <span>{hasUnsavedChanges ? 'Save changes' : 'Saved'}</span>
          </button>
          <button type="button" className="soft-button" onClick={onShare}>
            <DownloadIcon />
            <span>Share &amp; export</span>
          </button>
        </div>
        {showDebugUi ? (
          <details className="debug-panel">
            <summary>Debug details</summary>
            <p className="diagnostic-line">Backend: {draft.diagnostics.backend}</p>
            <p className="diagnostic-line">Model: {draft.diagnostics.model}</p>
            <p className="diagnostic-line">Reason: {draft.diagnostics.reason}</p>
            {draft.diagnostics.inputWarnings?.length ? (
              <p className="diagnostic-line">Warnings: {draft.diagnostics.inputWarnings.join(', ')}</p>
            ) : null}
            <button type="button" className="soft-button" onClick={onDiagnostics}>
              Download diagnostics
            </button>
          </details>
        ) : null}
      </aside>
    </section>
  )
}
