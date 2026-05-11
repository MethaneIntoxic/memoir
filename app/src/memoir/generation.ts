import type { Asset, GenerateMemoirPayload, Tone } from './types.ts'
import { parseGenerateMemoirPayload } from './validation.ts'

const DEFAULT_POLL_INTERVAL_MS = 1200

const jobStageLabels: Record<string, string> = {
  queued: 'Queued on the local memoir server',
  'asset-analysis': 'Analyzing selected photos',
  'memoir-draft': 'Drafting the memoir',
  completed: 'Draft ready',
}

export const composeGenerationStages = [
  { key: 'queued', label: 'Queued' },
  { key: 'asset-analysis', label: 'Asset analysis' },
  { key: 'memoir-draft', label: 'Memoir draft' },
] as const

export type ComposeGenerationStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ComposeGenerationMode = 'jobs' | 'legacy-direct'

export type ComposeGenerationProgress = {
  mode: ComposeGenerationMode
  jobId: string | null
  status: ComposeGenerationStatus
  stage: string
  progressPct: number
  label: string
}

export type StartComposeGenerationInput = {
  apiBase: string
  assets: Asset[]
  tone: Tone
  notes: string
  musicCue: string
  signal?: AbortSignal
  onProgress?: (progress: ComposeGenerationProgress) => void
  fetchImpl?: typeof fetch
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>
  pollIntervalMs?: number
}

type ComposeRequestBody = {
  assets: Asset[]
  tone: Tone
  notes: string
  musicCue: string
}

type PollingJobSnapshot = {
  jobId: string
  status: ComposeGenerationStatus
  stage: string
  progressPct: number
  pollPath: string | null
  result: GenerateMemoirPayload | null
  errorMessage: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeStatus(value: unknown): ComposeGenerationStatus {
  const status = readString(value)?.toLowerCase()

  if (status === 'queued') {
    return 'queued'
  }

  if (status === 'completed') {
    return 'completed'
  }

  if (status === 'failed') {
    return 'failed'
  }

  if (status === 'cancelled') {
    return 'cancelled'
  }

  return 'running'
}

function normalizeStage(value: unknown, fallback: string): string {
  return readString(value)?.toLowerCase() || fallback
}

function clampProgress(value: number | null, fallback: number): number {
  if (value === null) {
    return fallback
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

function describeStage(stage: string, status: ComposeGenerationStatus, mode: ComposeGenerationMode): string {
  if (mode === 'legacy-direct') {
    if (stage === 'legacy-direct') {
      return 'Requesting a draft from the legacy direct endpoint'
    }

    if (stage === 'assembling-draft') {
      return 'Assembling the editable memoir draft'
    }
  }

  if (status === 'completed') {
    return jobStageLabels.completed
  }

  if (status === 'failed') {
    return 'Generation failed'
  }

  if (status === 'cancelled') {
    return 'Generation cancelled'
  }

  return jobStageLabels[stage] || `Running ${stage.replaceAll('-', ' ')}`
}

function emitProgress(
  onProgress: StartComposeGenerationInput['onProgress'],
  progress: ComposeGenerationProgress,
) {
  onProgress?.(progress)
}

function buildProgress(
  mode: ComposeGenerationMode,
  snapshot: Pick<PollingJobSnapshot, 'jobId' | 'status' | 'stage' | 'progressPct'>,
): ComposeGenerationProgress {
  return {
    mode,
    jobId: snapshot.jobId,
    status: snapshot.status,
    stage: snapshot.stage,
    progressPct: snapshot.progressPct,
    label: describeStage(snapshot.stage, snapshot.status, mode),
  }
}

function buildComposeRequestBody(input: StartComposeGenerationInput): ComposeRequestBody {
  return {
    assets: input.assets,
    tone: input.tone,
    notes: input.notes,
    musicCue: input.musicCue,
  }
}

function parsePollingJobSnapshot(value: unknown): PollingJobSnapshot | null {
  const envelope = isRecord(value) && isRecord(value.job) ? value.job : value
  if (!isRecord(envelope)) {
    return null
  }

  const jobId = readString(envelope.jobId) ?? readString(envelope.id)
  if (!jobId) {
    return null
  }

  const status = normalizeStatus(envelope.status)
  const stage = normalizeStage(envelope.stage, status === 'completed' ? 'completed' : 'queued')
  const progressPct = clampProgress(readNumber(envelope.progressPct), status === 'completed' ? 100 : 0)

  let pollPath = readString(envelope.pollPath) ?? readString(envelope.pollUrl)
  if (!pollPath && isRecord(envelope.urls)) {
    pollPath = readString(envelope.urls.poll) ?? readString(envelope.urls.status)
  }

  const resultSource = isRecord(value) && 'result' in value ? value.result : envelope.result
  const draftSource = isRecord(value) && 'draft' in value ? value.draft : envelope.draft
  const result = parseGenerateMemoirPayload(resultSource) ?? parseGenerateMemoirPayload(draftSource) ?? parseGenerateMemoirPayload(value)

  let errorMessage = null
  if (isRecord(envelope.error)) {
    errorMessage = readString(envelope.error.message)
  }
  errorMessage ||= readString(envelope.errorMessage)
  errorMessage ||= readString(envelope.message)

  return {
    jobId,
    status,
    stage,
    progressPct,
    pollPath,
    result,
    errorMessage,
  }
}

function buildPollUrl(apiBase: string, snapshot: PollingJobSnapshot): string {
  if (snapshot.pollPath && /^https?:\/\//i.test(snapshot.pollPath)) {
    return snapshot.pollPath
  }

  if (snapshot.pollPath?.startsWith('/')) {
    return snapshot.pollPath
  }

  return `${apiBase}/generation-jobs/${snapshot.jobId}`
}

function jobsRouteUnavailable(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 405 || statusCode === 501
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function defaultWait(delayMs: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      resolve()
    }, delayMs)

    function onAbort() {
      cleanup()
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'))
    }

    function cleanup() {
      window.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
    }

    if (signal?.aborted) {
      onAbort()
      return
    }

    signal?.addEventListener('abort', onAbort)
  })
}

async function generateViaLegacyEndpoint(input: StartComposeGenerationInput): Promise<GenerateMemoirPayload> {
  const fetchImpl = input.fetchImpl || fetch

  emitProgress(input.onProgress, {
    mode: 'legacy-direct',
    jobId: null,
    status: 'running',
    stage: 'legacy-direct',
    progressPct: 18,
    label: describeStage('legacy-direct', 'running', 'legacy-direct'),
  })

  const response = await fetchImpl(`${input.apiBase}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildComposeRequestBody(input)),
    signal: input.signal,
  })

  if (!response.ok) {
    throw new Error(`Local AI request failed (${response.status})`)
  }

  emitProgress(input.onProgress, {
    mode: 'legacy-direct',
    jobId: null,
    status: 'running',
    stage: 'assembling-draft',
    progressPct: 84,
    label: describeStage('assembling-draft', 'running', 'legacy-direct'),
  })

  const payload = parseGenerateMemoirPayload(await readJsonResponse(response))
  if (!payload) {
    throw new Error('Local AI returned an invalid memoir draft')
  }

  emitProgress(input.onProgress, {
    mode: 'legacy-direct',
    jobId: null,
    status: 'completed',
    stage: 'completed',
    progressPct: 100,
    label: describeStage('completed', 'completed', 'legacy-direct'),
  })

  return payload
}

export function getComposeStageState(progress: ComposeGenerationProgress, stageKey: string): 'pending' | 'current' | 'done' {
  if (progress.mode !== 'jobs') {
    return 'pending'
  }

  const currentIndex = composeGenerationStages.findIndex((stage) => stage.key === progress.stage)
  const targetIndex = composeGenerationStages.findIndex((stage) => stage.key === stageKey)

  if (progress.status === 'completed') {
    return 'done'
  }

  if (currentIndex < 0 || targetIndex < 0) {
    return 'pending'
  }

  if (targetIndex < currentIndex) {
    return 'done'
  }

  if (targetIndex === currentIndex) {
    return 'current'
  }

  return 'pending'
}

export async function startComposeGeneration(input: StartComposeGenerationInput): Promise<GenerateMemoirPayload> {
  const fetchImpl = input.fetchImpl || fetch
  const wait = input.wait || defaultWait
  const pollIntervalMs = input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS

  emitProgress(input.onProgress, {
    mode: 'jobs',
    jobId: null,
    status: 'running',
    stage: 'queued',
    progressPct: 2,
    label: 'Preparing generation job',
  })

  const createResponse = await fetchImpl(`${input.apiBase}/generation-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildComposeRequestBody(input)),
    signal: input.signal,
  })

  if (jobsRouteUnavailable(createResponse.status)) {
    return generateViaLegacyEndpoint(input)
  }

  if (!createResponse.ok) {
    throw new Error(`Generation job request failed (${createResponse.status})`)
  }

  let snapshot = parsePollingJobSnapshot(await readJsonResponse(createResponse))
  if (!snapshot) {
    throw new Error('Generation job response was invalid')
  }

  emitProgress(input.onProgress, buildProgress('jobs', snapshot))

  try {
    while (snapshot.status === 'queued' || snapshot.status === 'running') {
      await wait(pollIntervalMs, input.signal)

      const pollResponse = await fetchImpl(buildPollUrl(input.apiBase, snapshot), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: input.signal,
      })

      if (!pollResponse.ok) {
        throw new Error(`Generation job polling failed (${pollResponse.status})`)
      }

      const nextSnapshot = parsePollingJobSnapshot(await readJsonResponse(pollResponse))
      if (!nextSnapshot) {
        throw new Error('Generation job status response was invalid')
      }

      snapshot = nextSnapshot
      emitProgress(input.onProgress, buildProgress('jobs', snapshot))
    }
  } catch (error) {
    if (input.signal?.aborted && snapshot.jobId) {
      await fetchImpl(`${input.apiBase}/generation-jobs/${snapshot.jobId}/cancel`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      }).catch(() => null)
    }

    throw error
  }

  if (snapshot.status === 'completed' && snapshot.result) {
    return snapshot.result
  }

  if (snapshot.status === 'cancelled') {
    throw new Error('Generation was cancelled')
  }

  if (snapshot.status === 'failed') {
    throw new Error(snapshot.errorMessage || 'Generation failed')
  }

  throw new Error('Generation completed without a memoir draft')
}

export { parsePollingJobSnapshot }
