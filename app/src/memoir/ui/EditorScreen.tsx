import type { Asset, Memoir, Theme } from '../types.ts'
import { ArrowLeftIcon, DownloadIcon, EditIcon, ImageIcon, MoreIcon, SaveIcon } from './icons.tsx'

type SectionField = 'caption' | 'body'

type EditorScreenProps = {
  draft: Memoir
  currentAssetMap: Map<string, Asset>
  busySection: string
  showDebugUi: boolean
  onArchive: () => void
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

const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: 'noir-journal', label: 'Sage journal' },
  { value: 'soft-archive', label: 'Blush archive' },
  { value: 'film-notes', label: 'Blue notes' },
]

function StoryCard({
  draft,
  asset,
  section,
  index,
  busySection,
  onSectionChange,
  onRewriteSection,
  onMoveSection,
}: Pick<EditorScreenProps, 'draft' | 'busySection' | 'onSectionChange' | 'onRewriteSection' | 'onMoveSection'> & {
  asset: Asset | undefined
  section: Memoir['sections'][number]
  index: number
}) {
  const isBusy = busySection === section.id

  return (
    <article className="story-card">
      <div className="story-card-media">
        {asset ? <img src={asset.dataUrl} alt="" /> : <span className="image-fallback"><ImageIcon /></span>}
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
          title="Polish caption"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onMoveSection(section.id, -1)}
          disabled={index === 0}
          aria-label={`Move chapter ${index + 1} left`}
          title="Move left"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onMoveSection(section.id, 1)}
          disabled={index === draft.sections.length - 1}
          aria-label={`Move chapter ${index + 1} right`}
          title="Move right"
        >
          <ArrowLeftIcon className="move-right-icon" />
        </button>
        <button
          type="button"
          className="icon-button"
          disabled={isBusy}
          onClick={() => onRewriteSection(section.id, 'body')}
          aria-label={`Polish chapter ${index + 1} body`}
          title="Polish body"
        >
          <MoreIcon />
        </button>
      </div>
    </article>
  )
}

export function EditorScreen({
  draft,
  currentAssetMap,
  busySection,
  showDebugUi,
  onArchive,
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
          <button type="button" className="soft-button compact-button" onClick={onArchive}>
            <ArrowLeftIcon />
            <span>Archive</span>
          </button>
          <p className="save-state">Editable storyboard</p>
        </div>

        <section className="memoir-cover">
          <div className="cover-copy">
            <p className="eyebrow">{new Date(draft.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
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
          {draft.assets[0]?.dataUrl ? <img className="cover-image" src={draft.assets[0].dataUrl} alt="" /> : null}
        </section>

        <section className="quote-panel">
          <textarea
            aria-label="Memoir quote"
            value={draft.quote}
            rows={2}
            onChange={(event) => onQuoteChange(event.target.value)}
          />
        </section>

        <div className="theme-row" role="group" aria-label="Memoir visual theme">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === draft.theme ? 'tone-button is-active' : 'tone-button'}
              onClick={() => onThemeChange(option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.value}</span>
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
                draft={draft}
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
        <p className="editor-sidebar-copy">Save it locally or choose a private export format.</p>
        <div className="editor-actions">
          <button type="button" className="primary-button" onClick={onSave}>
            <SaveIcon />
            <span>Save</span>
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
