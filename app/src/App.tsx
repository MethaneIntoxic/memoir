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
  exportInstagramSlides,
  exportPortableMemoir,
  importPortableMemoirFile,
  openMemoirPrintPreview,
} from './memoir/export.ts'
import {
  describeGenerationFailure,
  startComposeGeneration,
  type ComposeGenerationProgress,
} from './memoir/generation.ts'
import { clearArchiveStorage, readApiBase, readArchive, writeApiBase, writeArchive } from './memoir/storage.ts'
import type { Asset, Memoir, Theme, Tone } from './memoir/types.ts'
import { normalizeApiBase, parseRewriteText } from './memoir/validation.ts'
import { readRuntimeHealth, rewriteWithRuntime, type RuntimeHealth } from './platform/runtime-adapter.ts'
import { ArchiveScreen } from './memoir/ui/ArchiveScreen.tsx'
import { ComposeScreen } from './memoir/ui/ComposeScreen.tsx'
import { EditorScreen } from './memoir/ui/EditorScreen.tsx'
import { MemoirShell } from './memoir/ui/MemoirShell.tsx'
import { ReaderScreen } from './memoir/ui/ReaderScreen.tsx'
import { SettingsScreen } from './memoir/ui/SettingsScreen.tsx'
import { ShareExportDialog } from './memoir/ui/ShareExportDialog.tsx'
import { ConfirmClearDialog } from './memoir/ui/ConfirmClearDialog.tsx'

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

function describeLocalAiHealth(payload: RuntimeHealth): string {
  const { available, modelInstalled, model, runtime, platform, phase } = payload

  if (phase === 'copying' || phase === 'verifying' || phase === 'loading') {
    return `Preparing ${model} on this device${payload.progressPct === undefined ? '' : ` (${payload.progressPct}%)`}`
  }

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

  if (platform === 'android' || platform === 'ios') {
    return `On-device AI is unavailable (${payload.reason || 'native runtime unavailable'}). Mobile will not send memoir data to a server.`
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
  const [view, setView] = useState<'archive' | 'compose' | 'reader' | 'editor' | 'settings'>('archive')
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
  const [healthRefresh, setHealthRefresh] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false)
  const generationRunId = useRef(0)
  const generationAbort = useRef<AbortController | null>(null)
  const resolvedApiBase = useMemo(() => normalizeApiBase(apiBase), [apiBase])
  const showDebugUi = useMemo(() => isDebugUiEnabled(), [])
  const currentAssetMap = useMemo(
    () => new Map((draft?.assets || []).map((asset) => [asset.id, asset])),
    [draft],
  )
  const savedDraft = useMemo(
    () => (draft ? memoirs.find((memoir) => memoir.id === draft.id) || null : null),
    [draft, memoirs],
  )
  const hasUnsavedDraft = draft !== null && (!savedDraft || draft.updatedAt !== savedDraft.updatedAt)
  const hasUnsavedCompose = draft === null
    && (assets.length > 0 || notes.trim().length > 0 || musicCue.trim().length > 0)

  useEffect(() => {
    writeApiBase(resolvedApiBase)
  }, [resolvedApiBase])

  useEffect(() => {
    if (!hasUnsavedDraft && !hasUnsavedCompose) return
    const guardUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guardUnload)
    return () => window.removeEventListener('beforeunload', guardUnload)
  }, [hasUnsavedCompose, hasUnsavedDraft])

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

    readRuntimeHealth(resolvedApiBase)
      .then((payload) => {
        if (!cancelled) {
          setHealth(describeLocalAiHealth(payload))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth('Local AI status check failed; no memoir data was sent')
        }
      })

    return () => {
      cancelled = true
    }
  }, [resolvedApiBase, healthRefresh])

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const remainingSlots = MAX_CLIENT_ASSETS - assets.length
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, remainingSlots))
    event.target.value = ''
    if (remainingSlots <= 0) {
      setStage(`You can add up to ${MAX_CLIENT_ASSETS} photos`)
      return
    }
    if (!files.length) {
      return
    }

    setGenerationProgress(createIdleGenerationProgress())
    setStage('Preparing photos')

    try {
      const nextAssets = await Promise.all(files.map((file) => sanitizeImage(file)))
      setAssets((currentAssets) => [...currentAssets, ...nextAssets].slice(0, MAX_CLIENT_ASSETS))
      const nextCount = Math.min(MAX_CLIENT_ASSETS, assets.length + nextAssets.length)
      setStage(
        nextCount > MAX_VISION_ASSETS
          ? `Ready. First ${MAX_VISION_ASSETS} photos get live visual analysis.`
          : 'Ready to build the story',
      )
    } catch (error) {
      setStage(error instanceof Error ? error.message : 'Photo import failed')
    }
  }

  function removeAsset(assetId: string) {
    if (isGenerating) {
      return
    }

    setAssets((currentAssets) => currentAssets.filter((asset) => asset.id !== assetId))
    setGenerationProgress(createIdleGenerationProgress())
    setStage('Photo removed')
  }

  function moveAsset(assetId: string, direction: -1 | 1) {
    if (isGenerating) {
      return
    }

    setAssets((currentAssets) => {
      const currentIndex = currentAssets.findIndex((asset) => asset.id === assetId)
      const nextIndex = currentIndex + direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentAssets.length) {
        return currentAssets
      }

      const reordered = [...currentAssets]
      const [asset] = reordered.splice(currentIndex, 1)
      reordered.splice(nextIndex, 0, asset)
      return reordered
    })
    setGenerationProgress(createIdleGenerationProgress())
    setStage('Photo order updated')
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
      setView('reader')
      setStage('Draft ready')
    } catch (error) {
      if (generationRunId.current !== runId) {
        return
      }

      const message = describeGenerationFailure(error)
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
    if ((hasUnsavedCompose || (hasUnsavedDraft && draft?.id !== memoir.id))
        && !window.confirm('Discard unsaved changes and open this memoir?')) {
      return
    }
    if (isGenerating) {
      cancelGeneration()
    }

    setDraft(memoir)
    setView('reader')
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
    if ((hasUnsavedCompose || hasUnsavedDraft)
        && !window.confirm('Discard unsaved changes and start a new memoir?')) {
      return
    }
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

  function requestClearArchive() {
    if (memoirs.length > 0) {
      setClearConfirmationOpen(true)
    }
  }

  async function confirmClearArchive() {
    setClearConfirmationOpen(false)
    await clearArchive()
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
      setView('reader')
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
      const text = parseRewriteText(await rewriteWithRuntime({
        apiBase: resolvedApiBase,
        tone: draft.tone,
        text: target[field],
      }))
      if (!text) {
        throw new Error('Section rewrite returned invalid text')
      }

      setDraft((currentDraft) =>
        currentDraft ? updateMemoirSection(currentDraft, sectionId, field, text) : currentDraft,
      )
      setStage('Section polished')
    } catch (error) {
      setStage(describeGenerationFailure(error))
    } finally {
      setBusySection('')
    }
  }

  function updateDraftTheme(nextTheme: Theme) {
    setTheme(nextTheme)
    if (draft) {
      setDraft(updateMemoir(draft, { theme: nextTheme }))
    }
  }

  async function exportHtml() {
    if (draft) {
      await exportMemoirHtml(draft)
      setStage('Web memoir exported')
    }
  }

  async function exportPortable() {
    if (draft) {
      await exportPortableMemoir(draft)
      setStage('Portable memoir exported')
    }
  }

  async function exportInstagram() {
    if (!draft) {
      return
    }

    try {
      await exportInstagramSlides(draft)
      setStage('Instagram slides exported')
    } catch (error) {
      setStage(error instanceof Error ? error.message : 'Instagram slide export failed')
      throw error
    }
  }

  async function printPdf() {
    if (draft) {
      const opened = await openMemoirPrintPreview(draft)
      setStage(opened ? 'Print or share opened' : 'Print preview was blocked')
    }
  }

  function openShareDialog() {
    if (!draft) {
      setStage('Open a memoir before exporting')
      return
    }
    setShareOpen(true)
  }

  function refreshLocalAiHealth() {
    setHealth('Checking local AI...')
    setHealthRefresh((current) => current + 1)
  }

  async function downloadDiagnostics() {
    if (draft) {
      await exportMemoirDiagnostics(draft)
      setStage('Diagnostics exported')
    }
  }

  const themeClass = `theme-${draft?.theme || theme}`

  return (
    <>
      <MemoirShell
        view={view}
        themeClass={themeClass}
        health={health}
        stage={stage}
        isModalOpen={shareOpen || clearConfirmationOpen}
        onArchive={() => setView('archive')}
        onCreate={startNewMemoir}
        onStory={() => (draft ? setView('reader') : setView('archive'))}
        onSettings={() => setView('settings')}
      >
      {view === 'archive' ? (
        <ArchiveScreen
          archiveReady={archiveReady}
          memoirs={memoirs}
          onCreate={startNewMemoir}
          onOpen={openMemoir}
          onClear={requestClearArchive}
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
          showAdvancedRuntimeSettings={showDebugUi}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          onFiles={handleFiles}
          onRemoveAsset={removeAsset}
          onMoveAsset={moveAsset}
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
          onShare={openShareDialog}
          onDiagnostics={downloadDiagnostics}
        />
      ) : null}

      {view === 'reader' && draft ? (
        <ReaderScreen
          draft={draft}
          onArchive={() => setView('archive')}
          onEdit={() => setView('editor')}
          onSave={persistMemoir}
          onShare={openShareDialog}
        />
      ) : null}

      {view === 'settings' ? (
        <SettingsScreen
          health={health}
          memoirCount={memoirs.length}
          theme={draft?.theme || theme}
          hasDraft={draft !== null}
          onRefreshHealth={refreshLocalAiHealth}
          onThemeChange={updateDraftTheme}
          onOpenExports={openShareDialog}
          onExportDiagnostics={downloadDiagnostics}
          onRequestClearArchive={requestClearArchive}
        />
      ) : null}

      </MemoirShell>

      {shareOpen && draft ? (
        <ShareExportDialog
          memoirTitle={draft.title}
          onClose={() => setShareOpen(false)}
          onPrintPdf={printPdf}
          onExportHtml={exportHtml}
          onExportPortable={exportPortable}
          onExportSlides={exportInstagram}
        />
      ) : null}

      {clearConfirmationOpen ? (
        <ConfirmClearDialog
          memoirCount={memoirs.length}
          onCancel={() => setClearConfirmationOpen(false)}
          onConfirm={() => void confirmClearArchive()}
        />
      ) : null}
    </>
  )
}

export default App
