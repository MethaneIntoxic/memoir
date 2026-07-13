import type { ChangeEvent } from 'react'
import { MAX_VISION_ASSETS } from '../assets.ts'
import {
  composeGenerationStages,
  getComposeStageState,
  type ComposeGenerationProgress,
} from '../generation.ts'
import type { Asset, Tone } from '../types.ts'
import { ArrowLeftIcon, CheckIcon, ImageIcon, MusicIcon, SparkleIcon, TrashIcon, UploadIcon } from './icons.tsx'

const toneOptions: Array<{ value: Tone; label: string; hint: string }> = [
  { value: 'romantic', label: 'Romantic', hint: 'soft glow' },
  { value: 'playful', label: 'Playful', hint: 'bright little turns' },
  { value: 'diary', label: 'Diary', hint: 'private and close' },
  { value: 'editorial', label: 'Editorial', hint: 'polished keepsake' },
]

type ComposeScreenProps = {
  assets: Asset[]
  tone: Tone
  notes: string
  musicCue: string
  apiBase: string
  isGenerating: boolean
  generationProgress: ComposeGenerationProgress
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveAsset: (assetId: string) => void
  onMoveAsset: (assetId: string, direction: -1 | 1) => void
  onToneChange: (tone: Tone) => void
  onNotesChange: (notes: string) => void
  onMusicCueChange: (musicCue: string) => void
  onApiBaseChange: (apiBase: string) => void
  onGenerate: () => void
  onCancel: () => void
}

function PhotoStrip({ assets, isGenerating, onRemoveAsset, onMoveAsset }: Pick<ComposeScreenProps, 'assets' | 'isGenerating' | 'onRemoveAsset' | 'onMoveAsset'>) {
  if (!assets.length) {
    return (
      <div className="photo-strip is-empty" aria-label="No photos selected">
        <ImageIcon />
        <p>Your selected photos will appear here in story order.</p>
      </div>
    )
  }

  return (
    <div className="photo-strip" aria-label={`${assets.length} selected photos`}>
      {assets.map((asset, index) => (
        <figure key={asset.id} className="photo-tile">
          <img src={asset.dataUrl} alt={asset.name} />
          <figcaption>{index + 1}</figcaption>
          <div className="photo-tile-actions" aria-label={`Reorder or remove ${asset.name}`}>
            <button type="button" onClick={() => onMoveAsset(asset.id, -1)} disabled={isGenerating || index === 0} aria-label={`Move ${asset.name} earlier`}>
              <ArrowLeftIcon />
            </button>
            <button type="button" onClick={() => onMoveAsset(asset.id, 1)} disabled={isGenerating || index === assets.length - 1} aria-label={`Move ${asset.name} later`}>
              <ArrowLeftIcon className="move-later-icon" />
            </button>
            <button type="button" className="remove-photo" onClick={() => onRemoveAsset(asset.id)} disabled={isGenerating} aria-label={`Remove ${asset.name}`}>
              <TrashIcon />
            </button>
          </div>
        </figure>
      ))}
    </div>
  )
}

function ProgressPanel({ generationProgress }: Pick<ComposeScreenProps, 'generationProgress'>) {
  if (generationProgress.status === 'idle') {
    return null
  }

  return (
    <section className={`progress-panel is-${generationProgress.status}`} aria-live="polite" role={generationProgress.status === 'failed' ? 'alert' : 'status'}>
      <div className="progress-header">
        <div>
          <p className="eyebrow">Story build</p>
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
  notes,
  musicCue,
  apiBase,
  isGenerating,
  generationProgress,
  onFiles,
  onRemoveAsset,
  onMoveAsset,
  onToneChange,
  onNotesChange,
  onMusicCueChange,
  onApiBaseChange,
  onGenerate,
  onCancel,
}: ComposeScreenProps) {
  const selectedCount = assets.length

  return (
    <section className="screen compose-screen">
      <div className="compose-hero">
        <div>
          <p className="eyebrow">Recents</p>
          <h2>Select the day</h2>
          <p>Choose 3 to 10 captures from the same outing. Memoir turns the sequence into a story map.</p>
        </div>
        <label className={`primary-button file-action${selectedCount >= 10 || isGenerating ? ' is-disabled' : ''}`} aria-disabled={selectedCount >= 10 || isGenerating}>
          <UploadIcon />
          <span>{selectedCount >= 10 ? '10-photo limit reached' : selectedCount ? `Add photos (${selectedCount}/10)` : 'Choose photos'}</span>
          <input type="file" accept="image/*" multiple onChange={onFiles} disabled={selectedCount >= 10 || isGenerating} />
        </label>
      </div>

      <PhotoStrip assets={assets} isGenerating={isGenerating} onRemoveAsset={onRemoveAsset} onMoveAsset={onMoveAsset} />

      <div className="compose-grid">
        <section className="compose-panel">
          <div className="panel-heading">
            <SparkleIcon />
            <div>
              <h3>AI layout studio</h3>
              <p>{selectedCount ? `${selectedCount} selected. First ${Math.min(selectedCount, MAX_VISION_ASSETS)} get live visual analysis.` : 'Start with the photos that belong to the same day.'}</p>
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

          <label className="field-label">
            <span>Personal note</span>
            <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} rows={4} placeholder="What should the story remember about this day?" />
          </label>

          <label className="field-label">
            <span>
              <MusicIcon />
              Music cue
            </span>
            <input value={musicCue} onChange={(event) => onMusicCueChange(event.target.value)} placeholder="A song, artist, or sound that fits" />
          </label>
        </section>

        <aside className="compose-panel compose-summary">
          <h3>Story so far</h3>
          <dl>
            <div>
              <dt>Photos</dt>
              <dd>{selectedCount}/10</dd>
            </div>
            <div>
              <dt>Tone</dt>
              <dd>{tone}</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>Editable story board</dd>
            </div>
          </dl>
          <button type="button" className="primary-button" onClick={onGenerate} disabled={selectedCount < 3 || isGenerating}>
            <SparkleIcon />
            <span>{isGenerating ? 'Drafting story...' : `Generate from ${selectedCount || 0} photos`}</span>
          </button>
          {isGenerating ? (
            <button type="button" className="soft-button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <details className="advanced-panel">
            <summary>Local AI route</summary>
            <label className="field-label">
              <span>API base</span>
              <input value={apiBase} onChange={(event) => onApiBaseChange(event.target.value)} placeholder="/api or http://YOUR-LAN-IP:8787/api" />
            </label>
          </details>
        </aside>
      </div>

      <ProgressPanel generationProgress={generationProgress} />
    </section>
  )
}
