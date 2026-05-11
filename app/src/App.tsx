import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import './App.css'
import {
  MAX_CLIENT_ASSETS,
  MAX_CLIENT_PAYLOAD_BYTES,
  MAX_VISION_ASSETS,
  sanitizeImage,
} from './memoir/assets.ts'
import {
  createMemoirDraft,
  moveMemoirSection,
  type SectionField,
  updateMemoir,
  updateMemoirSection,
  upsertMemoirInArchive,
} from './memoir/document.ts'
import {
  exportMemoirDiagnostics,
  exportMemoirHtml,
  exportPortableMemoir,
  importPortableMemoirFile,
  openMemoirPrintPreview,
} from './memoir/export.ts'
import {
  startComposeGeneration,
  type ComposeGenerationProgress,
} from './memoir/generation.ts'
import { clearArchiveStorage, readApiBase, readArchive, writeApiBase, writeArchive } from './memoir/storage.ts'
import type { Asset, Memoir, Theme, Tone } from './memoir/types.ts'
import { normalizeApiBase, parseRewriteText } from './memoir/validation.ts'
import { ArchiveScreen } from './memoir/ui/ArchiveScreen.tsx'
import { ComposeScreen } from './memoir/ui/ComposeScreen.tsx'
import { EditorScreen } from './memoir/ui/EditorScreen.tsx'
import { MemoirShell } from './memoir/ui/MemoirShell.tsx'

function createIdleGenerationProgress(): ComposeGenerationProgress {
  return {
    mode: 'jobs',
    jobId: null,
    status: 'idle',
    stage: 'idle',
    progressPct: 0,
    label: 'Idle',
  }
}

function describeLocalAiHealth(payload: Record<string, unknown>): string {
  const available = payload.available === true
  const modelInstalled = payload.modelInstalled === true
  const model = typeof payload.model === 'string' && payload.model.trim() ? payload.model : 'the configured model'
  const runtime = typeof payload.runtime === 'string' ? payload.runtime : ''

  if (available && modelInstalled) {
    return `Local AI ready on ${model}`
  }

  if (available) {
    if (runtime === 'embedded-llama') {
      return `Bundled local AI is running, but ${model} is unavailable in the packaged runtime`
    }

    return `Ollama is running, but ${model} is not pulled yet`
  }

  if (runtime === 'embedded-llama') {
    return 'Bundled local AI is unavailable, fallback drafting will be used'
  }

  return 'Local AI server is unavailable, fallback drafting will be used'
}

function isDebugUiEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.memoirDesktop?.packaged) {
    return false
  }

  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('debug') === '1' || window.localStorage.getItem('memoir-debug') === '1'
  } catch {
    return false
  }
}

function App() {
  const [view, setView] = useState<'archive' | 'compose' | 'editor'>('archive')
  const [memoirs, setMemoirs] = useState<Memoir[]>([])
  const [archiveReady, setArchiveReady] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [tone, setTone] = useState<Tone>('romantic')
  const [theme, setTheme] = useState<Theme>('soft-archive')
  const [notes, setNotes] = useState('')
  const [musicCue, setMusicCue] = useState('')
  const [draft, setDraft] = useState<Memoir | null>(null)
  const [apiBase, setApiBase] = useState(() => readApiBase())
  const [health, setHealth] = useState('Checking local AI...')
  const [isGenerating, setIsGenerating] = useState(false)
  const [stage, setStage] = useState('Idle')
  const [generationProgress, setGenerationProgress] = useState<ComposeGenerationProgress>(() => createIdleGenerationProgress())
  const [busySection, setBusySection] = useState('')
  const generationRunId = useRef(0)
  const generationAbort = useRef<AbortController | null>(null)
  const resolvedApiBase = useMemo(() => normalizeApiBase(apiBase), [apiBase])
  const showDebugUi = useMemo(() => isDebugUiEnabled(), [])
  const currentAssetMap = useMemo(
    () => new Map((draft?.assets || []).map((asset) => [asset.id, asset])),
    [draft],
  )

  useEffect(() => {
    writeApiBase(resolvedApiBase)
  }, [resolvedApiBase])

  useEffect(() => {
    let cancelled = false

    void readArchive()
      .then((storedMemoirs) => {
        if (cancelled) {
          return
        }

        setMemoirs((currentMemoirs) =>
          currentMemoirs.reduce(
            (mergedMemoirs, currentMemoir) => upsertMemoirInArchive(mergedMemoirs, currentMemoir),
            storedMemoirs,
          ),
        )
        setArchiveReady(true)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setArchiveReady(true)
        setStage((currentStage) => (currentStage === 'Idle' ? 'Archive unavailable' : currentStage))
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch(`${resolvedApiBase}/health`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setHealth(describeLocalAiHealth(payload))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth('Local AI server is unavailable, fallback drafting will be used')
        }
      })

    return () => {
      cancelled = true
    }
  }, [resolvedApiBase])

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, MAX_CLIENT_ASSETS)
    event.target.value = ''
    if (!files.length) {
      return
    }

    setGenerationProgress(createIdleGenerationProgress())
    setStage('Preparing photos')

    try {
      const nextAssets = await Promise.all(files.map((file) => sanitizeImage(file)))
      setAssets(nextAssets)
      setStage(
        nextAssets.length > MAX_VISION_ASSETS
          ? `Ready. First ${MAX_VISION_ASSETS} photos get live visual analysis.`
          : 'Ready to build the story',
      )
    } catch (error) {
      setStage(error instanceof Error ? error.message : 'Photo import failed')
    }
  }

  async function handleGenerate() {
    if (assets.length < 3) {
      setStage('Pick at least 3 photos to generate a memoir')
      return
    }

    const payloadBytes = JSON.stringify({ assets, tone, notes, musicCue }).length
    if (payloadBytes > MAX_CLIENT_PAYLOAD_BYTES) {
      setStage('Selected photos are still too large. Remove a few and try again.')
      return
    }

    const runId = generationRunId.current + 1
    const controller = new AbortController()
    generationRunId.current = runId
    generationAbort.current = controller
    setIsGenerating(true)
    setGenerationProgress({
      mode: 'jobs',
      jobId: null,
      status: 'running',
      stage: 'queued',
      progressPct: 2,
      label: 'Preparing story build',
    })
    setStage('Preparing story build')

    try {
      const payload = await startComposeGeneration({
        apiBase: resolvedApiBase,
        assets,
        tone,
        notes,
        musicCue,
        signal: controller.signal,
        onProgress(progress) {
          if (generationRunId.current === runId) {
            setGenerationProgress(progress)
            setStage(progress.label)
          }
        },
      })

      if (generationRunId.current !== runId || controller.signal.aborted) {
        return
      }

      setStage('Opening editable storyboard')

      const memoir = createMemoirDraft({ assets, tone, theme, notes, musicCue, payload })

      setDraft(memoir)
      setView('editor')
      setStage('Draft ready')
    } catch (error) {
      if (generationRunId.current !== runId) {
        return
      }

      const message = error instanceof Error ? error.message : 'Generation failed'
      setGenerationProgress((current) => ({
        ...current,
        status: controller.signal.aborted ? 'cancelled' : 'failed',
        label: controller.signal.aborted ? 'Generation cancelled' : message,
      }))
      setStage(controller.signal.aborted ? 'Generation cancelled' : message)
    } finally {
      if (generationRunId.current === runId) {
        setIsGenerating(false)
        generationAbort.current = null
      }
    }
  }

  function cancelGeneration() {
    generationRunId.current += 1
    generationAbort.current?.abort()
    generationAbort.current = null
    setIsGenerating(false)
    setGenerationProgress((current) => ({
      ...current,
      status: 'cancelled',
      label: 'Generation cancelled',
    }))
    setStage('Generation cancelled')
  }

  async function persistMemoir() {
    if (!draft) {
      return
    }

    const savedDraft = updateMemoir(draft, {})
    const next = upsertMemoirInArchive(memoirs, savedDraft)

    try {
      await writeArchive(next)
      setMemoirs(next)
      setArchiveReady(true)
      setDraft(savedDraft)
      setStage('Saved to archive')
    } catch {
      setStage('Archive save failed')
    }
  }

  function openMemoir(memoir: Memoir) {
    if (isGenerating) {
      cancelGeneration()
    }

    setDraft(memoir)
    setView('editor')
    setTheme(memoir.theme)
    setTone(memoir.tone)
    setGenerationProgress(createIdleGenerationProgress())
    setStage('Opened from archive')
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    if (!draft) {
      return
    }

    setDraft(moveMemoirSection(draft, sectionId, direction))
  }

  function startNewMemoir() {
    if (isGenerating) {
      cancelGeneration()
    }

    setAssets([])
    setNotes('')
    setMusicCue('')
    setTone('romantic')
    setTheme('soft-archive')
    setDraft(null)
    setGenerationProgress(createIdleGenerationProgress())
    setStage('Idle')
    setView('compose')
  }

  async function clearArchive() {
    try {
      await clearArchiveStorage()
      setMemoirs([])
      setArchiveReady(true)
      setDraft(null)
      setView('archive')
      setGenerationProgress(createIdleGenerationProgress())
      setStage('Archive cleared')
    } catch {
      setStage('Archive clear failed')
    }
  }

  async function handlePortableImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    try {
      const importedMemoir = await importPortableMemoirFile(file)
      const next = upsertMemoirInArchive(memoirs, importedMemoir)
      await writeArchive(next)
      setMemoirs(next)
      setArchiveReady(true)
      setDraft(importedMemoir)
      setTheme(importedMemoir.theme)
      setTone(importedMemoir.tone)
      setGenerationProgress(createIdleGenerationProgress())
      setView('editor')
      setStage('Portable memoir imported')
    } catch (error) {
      setStage(error instanceof Error ? error.message : 'Portable memoir import failed')
    }
  }

  async function rewriteSection(sectionId: string, field: SectionField) {
    if (!draft) {
      return
    }

    const target = draft.sections.find((section) => section.id === sectionId)
    if (!target) {
      return
    }

    setBusySection(sectionId)
    try {
      const response = await fetch(`${resolvedApiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rewrite-block',
          tone: draft.tone,
          text: target[field],
        }),
      })

      if (!response.ok) {
        throw new Error(`Section rewrite failed (${response.status})`)
      }

      const text = parseRewriteText(await response.json())
      if (!text) {
        throw new Error('Section rewrite returned invalid text')
      }

      setDraft((currentDraft) =>
        currentDraft ? updateMemoirSection(currentDraft, sectionId, field, text) : currentDraft,
      )
      setStage('Section polished')
    } catch (error) {
      setStage(error instanceof Error ? error.message : 'Section rewrite failed')
    } finally {
      setBusySection('')
    }
  }

  function updateDraftTheme(nextTheme: Theme) {
    if (!draft) {
      return
    }

    setTheme(nextTheme)
    setDraft(updateMemoir(draft, { theme: nextTheme }))
  }

  function exportHtml() {
    if (draft) {
      exportMemoirHtml(draft)
    }
  }

  function exportPortable() {
    if (draft) {
      exportPortableMemoir(draft)
      setStage('Portable memoir exported')
    }
  }

  function printPdf() {
    if (draft) {
      openMemoirPrintPreview(draft)
    }
  }

  function downloadDiagnostics() {
    if (draft) {
      exportMemoirDiagnostics(draft)
      setStage('Diagnostics exported')
    }
  }

  const themeClass = `theme-${draft?.theme || theme}`

  return (
    <MemoirShell
      view={view}
      themeClass={themeClass}
      health={health}
      stage={stage}
      onArchive={() => setView('archive')}
      onCreate={startNewMemoir}
    >
      {view === 'archive' ? (
        <ArchiveScreen
          archiveReady={archiveReady}
          memoirs={memoirs}
          onCreate={startNewMemoir}
          onOpen={openMemoir}
          onClear={clearArchive}
          onImport={handlePortableImport}
        />
      ) : null}

      {view === 'compose' ? (
        <ComposeScreen
          assets={assets}
          tone={tone}
          notes={notes}
          musicCue={musicCue}
          apiBase={apiBase}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          onFiles={handleFiles}
          onToneChange={setTone}
          onNotesChange={setNotes}
          onMusicCueChange={setMusicCue}
          onApiBaseChange={setApiBase}
          onGenerate={handleGenerate}
          onCancel={cancelGeneration}
        />
      ) : null}

      {view === 'editor' && draft ? (
        <EditorScreen
          draft={draft}
          currentAssetMap={currentAssetMap}
          busySection={busySection}
          showDebugUi={showDebugUi}
          onArchive={() => setView('archive')}
          onTitleChange={(title) => setDraft(updateMemoir(draft, { title }))}
          onSummaryChange={(summary) => setDraft(updateMemoir(draft, { summary }))}
          onQuoteChange={(quote) => setDraft(updateMemoir(draft, { quote }))}
          onThemeChange={updateDraftTheme}
          onSectionChange={(sectionId, field, value) => setDraft(updateMemoirSection(draft, sectionId, field, value))}
          onRewriteSection={rewriteSection}
          onMoveSection={moveSection}
          onSave={persistMemoir}
          onExportHtml={exportHtml}
          onExportPortable={exportPortable}
          onPrintPdf={printPdf}
          onDiagnostics={downloadDiagnostics}
        />
      ) : null}
    </MemoirShell>
  )
}

export default App
