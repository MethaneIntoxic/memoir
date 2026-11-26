import { memo, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { MAX_CLIENT_ASSETS, MAX_VISION_ASSETS } from '../assets.ts'
import {
  composeGenerationStages,
  getComposeStageState,
  type ComposeGenerationProgress,
} from '../generation.ts'
import { extractDayPalette } from '../palette.ts'
import type { Asset, Theme, Tone } from '../types.ts'
import {
  ArrowLeftIcon,
  CheckIcon,
  ImageIcon,
  MusicIcon,
  PaletteIcon,
  SparkleIcon,
  TrashIcon,
  UploadIcon,
} from './icons.tsx'

const toneOptions: Array<{ value: Tone; label: string; hint: string }> = [
  { value: 'romantic', label: 'Romantic', hint: 'soft golden glow' },
  { value: 'playful', label: 'Playful', hint: 'bright little turns' },
  { value: 'diary', label: 'Diary', hint: 'private and close' },
  { value: 'editorial', label: 'Editorial', hint: 'polished zine' },
]

const themeOptions: Array<{ value: Theme; label: string; hint: string; dots: [string, string, string] }> = [
  { value: 'soft-archive', label: 'Riso paper', hint: 'newsprint & vermilion', dots: ['#f4f0e8', '#151311', '#c43627'] },
  { value: 'noir-journal', label: 'Carbon lab', hint: 'darkroom & safelight', dots: ['#0f0f0d', '#ebe5d9', '#e45c33'] },
  { value: 'film-notes', label: 'Cyanotype', hint: 'blueprint & ochre', dots: ['#edf1f5', '#0f2342', '#b8661e'] },
]

const storyPromptChips = [
  'Golden hour walk & iced coffee',
  'Rainy evening noodles & neon',
  'Spontaneous coastal detour',
  'Slow Sunday at home',
]

type ComposeScreenProps = {
  assets: Asset[]
  tone: Tone
  theme: Theme
  notes: string
  musicCue: string
  apiBase: string
  showAdvancedRuntimeSettings: boolean
  isGenerating: boolean
  generationProgress: ComposeGenerationProgress
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onDropFiles: (files: File[]) => void
  onRemoveAsset: (assetId: string) => void
  onMoveAsset: (assetId: string, direction: -1 | 1) => void
  onReorderAsset: (fromIndex: number, toIndex: number) => void
  onToneChange: (tone: Tone) => void
  onThemeChange: (theme: Theme) => void
  onNotesChange: (notes: string) => void
  onMusicCueChange: (musicCue: string) => void
  onApiBaseChange: (apiBase: string) => void
  onGenerate: () => void
  onCancel: () => void
  onToast?: (message: string) => void
}

const PhotoTile = memo(function PhotoTile({
  asset,
  index,
  total,
  isGenerating,
  isDragOver,
  onMoveAsset,
  onRemoveAsset,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  asset: Asset
  index: number
  total: number
  isGenerating: boolean
  isDragOver: boolean
  onMoveAsset: (assetId: string, direction: -1 | 1) => void
  onRemoveAsset: (assetId: string) => void
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDrop: (index: number) => void
  onDragEnd: () => void
}) {
  return (
    <figure
      className={isDragOver ? 'photo-tile is-drag-over' : 'photo-tile'}
      draggable={!isGenerating}
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(index)
      }}
      onDragEnd={onDragEnd}
    >
      <img src={asset.dataUrl} alt={asset.name} decoding="async" />
      <figcaption>{index + 1}</figcaption>
      {index < MAX_VISION_ASSETS ? <span className="photo-tile-vision-tag">AI</span> : null}
      <div className="photo-tile-actions" aria-label={`Reorder or remove ${asset.name}`}>
        <button
          type="button"
          onClick={() => onMoveAsset(asset.id, -1)}
          disabled={isGenerating || index === 0}
          aria-label={`Move ${asset.name} earlier`}
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          onClick={() => onMoveAsset(asset.id, 1)}
          disabled={isGenerating || index === total - 1}
          aria-label={`Move ${asset.name} later`}
        >
          <ArrowLeftIcon className="move-later-icon" />
        </button>
        <button
          type="button"
          className="remove-photo"
          onClick={() => onRemoveAsset(asset.id)}
          disabled={isGenerating}
          aria-label={`Remove ${asset.name}`}
        >
          <TrashIcon />
        </button>
      </div>
    </figure>
  )
})

function PhotoStrip({
  assets,
  isGenerating,
  onRemoveAsset,
  onMoveAsset,
  onReorderAsset,
  onOpenPicker,
}: Pick<ComposeScreenProps, 'assets' | 'isGenerating' | 'onRemoveAsset' | 'onMoveAsset' | 'onReorderAsset'> & {
  onOpenPicker: () => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (!assets.length) {
    return (
      <div
        className="photo-strip is-empty"
        role="button"
        tabIndex={0}
        aria-label="No photos selected. Click or drop photos here."
        onClick={onOpenPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenPicker()
          }
        }}
      >
        <ImageIcon />
        <p>Drop 3 to 10 photos onto the light table, paste from clipboard, or tap to choose.</p>
        <span className="dropzone-hint">Drag to reorder · 100% private on-device</span>
      </div>
    )
  }

  return (
    <div className="photo-strip" aria-label={`${assets.length} selected photos`}>
      {assets.map((asset, index) => (
        <PhotoTile
          key={asset.id}
          asset={asset}
          index={index}
          total={assets.length}
          isGenerating={isGenerating}
          isDragOver={overIndex === index && dragIndex !== null && dragIndex !== index}
          onMoveAsset={onMoveAsset}
          onRemoveAsset={onRemoveAsset}
          onDragStart={setDragIndex}
          onDragEnter={setOverIndex}
          onDrop={(targetIndex) => {
            if (dragIndex !== null && dragIndex !== targetIndex) {
              onReorderAsset(dragIndex, targetIndex)
            }
            setDragIndex(null)
            setOverIndex(null)
          }}
          onDragEnd={() => {
            setDragIndex(null)
            setOverIndex(null)
          }}
        />
      ))}
    </div>
  )
}

function ProgressPanel({
  generationProgress,
  assets,
}: Pick<ComposeScreenProps, 'generationProgress' | 'assets'>) {
  if (generationProgress.status === 'idle') {
    return null
  }

  return (
    <section
      className={`progress-panel is-${generationProgress.status}`}
      aria-live="polite"
      role={generationProgress.status === 'failed' ? 'alert' : 'status'}
    >
      <div className="progress-header">
        <div>
          <p className="eyebrow">Developing roll</p>
          <h3>{generationProgress.label}</h3>
        </div>
        <p className="progress-percent">{generationProgress.progressPct}%</p>
      </div>
      <label className="sr-only" htmlFor="compose-generation-progress">
        Memoir generation progress
      </label>
      <progress
        id="compose-generation-progress"
        className="progress-meter"
        max={100}
        value={generationProgress.progressPct}
      >
        {generationProgress.progressPct}%
      </progress>
      {generationProgress.status === 'running' && assets.length > 0 ? (
        <div className="developing-filmstrip" aria-hidden="true">
          {assets.slice(0, 8).map((asset, index) => (
            <span
              key={asset.id}
              className="developing-thumb"
              style={{ animationDelay: `${index * 160}ms` }}
            >
              <img src={asset.dataUrl} alt="" />
            </span>
          ))}
        </div>
      ) : null}
      {generationProgress.mode === 'jobs' ? (
        <ol className="progress-stage-list">
          {composeGenerationStages.map((jobStage) => {
            const state = getComposeStageState(generationProgress, jobStage.key)

            return (
              <li key={jobStage.key} className={`progress-stage is-${state}`}>
                <CheckIcon />
                <span>{jobStage.label}</span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="progress-note">Drafting through the direct local route.</p>
      )}
    </section>
  )
}

export function ComposeScreen({
  assets,
  tone,
  theme,
  notes,
  musicCue,
  apiBase,
  showAdvancedRuntimeSettings,
  isGenerating,
  generationProgress,
  onFiles,
  onDropFiles,
  onRemoveAsset,
  onMoveAsset,
  onReorderAsset,
  onToneChange,
  onThemeChange,
  onNotesChange,
  onMusicCueChange,
  onApiBaseChange,
  onGenerate,
  onCancel,
  onToast,
}: ComposeScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [daySwatches, setDaySwatches] = useState<string[]>([])

  const selectedCount = assets.length
  const missingPhotoCount = Math.max(0, 3 - selectedCount)
  const generateLabel = isGenerating
    ? 'Developing story...'
    : missingPhotoCount > 0
      ? `Add ${missingPhotoCount} more photo${missingPhotoCount === 1 ? '' : 's'}`
      : `Develop story from ${selectedCount} photos`

  useEffect(() => {
    if (!assets.length) {
      return
    }
    let cancelled = false
    void extractDayPalette(assets).then(({ day }) => {
      if (!cancelled) {
        setDaySwatches(day.swatches)
      }
    })
    return () => {
      cancelled = true
    }
  }, [assets])

  const visibleSwatches = assets.length > 0 ? daySwatches : []

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isGenerating) return
      const items = Array.from(event.clipboardData?.items || [])
      const imageFiles = items
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)
      if (imageFiles.length > 0) {
        event.preventDefault()
        onDropFiles(imageFiles)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isGenerating, onDropFiles])

  function handleZoneDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault()
      setIsDraggingFiles(true)
    }
  }

  function handleZoneDrop(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.files?.length) {
      setIsDraggingFiles(false)
      return
    }
    event.preventDefault()
    setIsDraggingFiles(false)
    if (!isGenerating) {
      const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
      if (files.length) {
        onDropFiles(files)
      }
    }
  }

  function copyHex(hex: string) {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(hex).catch(() => {})
    }
    onToast?.(`Copied ${hex.toUpperCase()}`)
  }

  return (
    <section className="screen compose-screen">
      <div className="compose-hero">
        <div>
          <p className="eyebrow">Light table</p>
          <h2>Select the day</h2>
          <p>Drop, paste, or choose 3 to {MAX_CLIENT_ASSETS} frames. Drag thumbnails to set the story rhythm.</p>
        </div>
        <label
          className={`primary-button file-action${selectedCount >= MAX_CLIENT_ASSETS || isGenerating ? ' is-disabled' : ''}`}
          aria-disabled={selectedCount >= MAX_CLIENT_ASSETS || isGenerating}
        >
          <UploadIcon />
          <span>
            {selectedCount >= MAX_CLIENT_ASSETS
              ? '10-photo limit reached'
              : selectedCount
                ? `Add photos (${selectedCount}/${MAX_CLIENT_ASSETS})`
                : 'Choose photos'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            disabled={selectedCount >= MAX_CLIENT_ASSETS || isGenerating}
          />
        </label>
      </div>

      <div
        className={isDraggingFiles ? 'photo-dropzone is-dragging' : 'photo-dropzone'}
        onDragOver={handleZoneDragOver}
        onDragLeave={() => setIsDraggingFiles(false)}
        onDrop={handleZoneDrop}
      >
        <PhotoStrip
          assets={assets}
          isGenerating={isGenerating}
          onRemoveAsset={onRemoveAsset}
          onMoveAsset={onMoveAsset}
          onReorderAsset={onReorderAsset}
          onOpenPicker={() => fileInputRef.current?.click()}
        />
      </div>

      {visibleSwatches.length > 0 ? (
        <div className="color-dna-bar" aria-label="Extracted day color palette">
          <div className="color-dna-head">
            <span className="color-dna-label">Day Pigment Strip · Color DNA</span>
            <span className="color-dna-label">Tap to copy hex</span>
          </div>
          <div className="color-dna-swatches">
            {visibleSwatches.map((hex) => (
              <button
                key={hex}
                type="button"
                className="swatch-chip"
                onClick={() => copyHex(hex)}
                title={`Copy ${hex}`}
              >
                <span className="swatch-dot" style={{ backgroundColor: hex }} />
                <span>{hex.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="compose-grid">
        <section className="compose-panel">
          <div className="panel-heading">
            <SparkleIcon />
            <div>
              <h3>AI story studio</h3>
              <p>
                {selectedCount
                  ? `${selectedCount} selected. First ${Math.min(selectedCount, MAX_VISION_ASSETS)} frames get private on-device visual analysis.`
                  : 'Pick your voice and film stock before developing the roll.'}
              </p>
            </div>
          </div>

          <div className="tone-row" role="group" aria-label="Memoir tone">
            {toneOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === tone ? 'tone-button is-active' : 'tone-button'}
                onClick={() => onToneChange(option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="field-label">
            <span>
              <PaletteIcon />
              Film stock &amp; visual mood
            </span>
            <div className="theme-row theme-row-3" role="group" aria-label="Visual film stock">
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
          </div>

          <label className="field-label">
            <span>Personal note</span>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="What should the story remember about this day?"
            />
          </label>

          <div className="prompt-chip-row" aria-label="Quick story inspiration">
            {storyPromptChips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="prompt-chip"
                onClick={() => onNotesChange(notes.trim() ? `${notes.trim()} — ${chip.toLowerCase()}` : chip)}
              >
                + {chip}
              </button>
            ))}
          </div>

          <label className="field-label">
            <span>
              <MusicIcon />
              Music cue
            </span>
            <input
              value={musicCue}
              onChange={(event) => onMusicCueChange(event.target.value)}
              placeholder="A song, artist, or soundtrack that fits"
            />
          </label>
        </section>

        <aside className="compose-panel compose-summary">
          <h3>Roll summary</h3>
          <dl>
            <div>
              <dt>Frames</dt>
              <dd>{selectedCount}/{MAX_CLIENT_ASSETS}</dd>
            </div>
            <div>
              <dt>Voice</dt>
              <dd>{tone}</dd>
            </div>
            <div>
              <dt>Film stock</dt>
              <dd>{theme.replace('-', ' ')}</dd>
            </div>
            <div>
              <dt>Exports</dt>
              <dd>Carousel · Poster · Reel</dd>
            </div>
          </dl>
          <button type="button" className="primary-button" onClick={onGenerate} disabled={selectedCount < 3 || isGenerating}>
            <SparkleIcon />
            <span>{generateLabel}</span>
          </button>
          {isGenerating ? (
            <button type="button" className="soft-button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          {showAdvancedRuntimeSettings ? (
            <details className="advanced-panel">
              <summary>Developer AI route</summary>
              <label className="field-label">
                <span>API base</span>
                <input
                  value={apiBase}
                  onChange={(event) => onApiBaseChange(event.target.value)}
                  placeholder="/api or http://127.0.0.1:8787/api"
                />
              </label>
            </details>
          ) : null}
        </aside>
      </div>

      <ProgressPanel generationProgress={generationProgress} assets={assets} />
    </section>
  )
}
