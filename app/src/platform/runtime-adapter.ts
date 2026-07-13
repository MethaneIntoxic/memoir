import { Capacitor, registerPlugin } from '@capacitor/core'
import type { Tone } from '../memoir/types.ts'

export type RuntimePhase =
  | 'checking'
  | 'needs-prepare'
  | 'copying'
  | 'verifying'
  | 'loading'
  | 'ready'
  | 'unavailable'
  | 'failed'

export type RuntimeHealth = {
  platform: 'web' | 'desktop' | 'android' | 'ios'
  runtime: string
  model: string
  phase: RuntimePhase
  available: boolean
  modelInstalled: boolean
  progressPct?: number
  reason?: string
}

export type NativeComposeRequest = {
  jobId: string
  assets: Array<{ id: string }>
  tone: Tone
  notes: string
  musicCue: string
}

export type NativeStageAssetRequest = {
  assetId: string
  dataUrl: string
}

export type NativeRewriteRequest = {
  jobId: string
  tone: Tone
  text: string
}

export type NativeRuntimeBridge = {
  health(): Promise<unknown>
  prepare(): Promise<unknown>
  stageAsset(payload: NativeStageAssetRequest): Promise<unknown>
  clearStagedAssets(): Promise<unknown>
  generateMemoir(payload: NativeComposeRequest): Promise<unknown>
  rewrite(payload: NativeRewriteRequest): Promise<unknown>
  cancelGeneration(options: { jobId: string }): Promise<unknown>
}

const NATIVE_PLUGIN_NAME = 'MemoirRuntime'
const MemoirRuntime = registerPlugin<NativeRuntimeBridge>(NATIVE_PLUGIN_NAME)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizePhase(value: unknown, available: boolean, modelInstalled: boolean): RuntimePhase {
  const phase = readString(value)?.toLowerCase()
  const supported: RuntimePhase[] = [
    'checking',
    'needs-prepare',
    'copying',
    'verifying',
    'loading',
    'ready',
    'unavailable',
    'failed',
  ]

  if (phase && supported.includes(phase as RuntimePhase)) {
    return phase as RuntimePhase
  }

  if (available && modelInstalled) {
    return 'ready'
  }

  return modelInstalled ? 'unavailable' : 'needs-prepare'
}

export function parseRuntimeHealth(value: unknown, platform = getRuntimePlatform()): RuntimeHealth {
  const payload = isRecord(value) ? value : {}
  const available = payload.available === true
  const modelInstalled = payload.modelInstalled === true
  const progress = typeof payload.progressPct === 'number' && Number.isFinite(payload.progressPct)
    ? Math.min(100, Math.max(0, Math.round(payload.progressPct)))
    : undefined

  return {
    platform,
    runtime: readString(payload.runtime) || (platform === 'web' ? 'local-http' : 'native-runtime'),
    model: readString(payload.model) || 'qwen3.5-0.8b-q5_K_M',
    phase: normalizePhase(payload.phase, available, modelInstalled),
    available,
    modelInstalled,
    progressPct: progress,
    reason: readString(payload.reason),
  }
}

export function getRuntimePlatform(): RuntimeHealth['platform'] {
  if (typeof window !== 'undefined' && window.memoirDesktop) {
    return 'desktop'
  }

  const platform = Capacitor.getPlatform()
  if (platform === 'android' || platform === 'ios') {
    return platform
  }

  return 'web'
}

export function isNativeRuntimePlatform(): boolean {
  const platform = getRuntimePlatform()
  return platform === 'android' || platform === 'ios'
}

export function getNativeRuntimeBridge(): NativeRuntimeBridge | null {
  return isNativeRuntimePlatform() ? MemoirRuntime : null
}

function readNativeReadiness(value: unknown): { available: boolean; reason: string } {
  if (!isRecord(value)) {
    return { available: false, reason: 'native-ai-health-invalid' }
  }

  return {
    available: value.available === true,
    reason: readString(value.reason) || 'native-ai-runtime-unavailable',
  }
}

export async function ensureNativeRuntimeReady(bridge: NativeRuntimeBridge): Promise<void> {
  let readiness = readNativeReadiness(await bridge.health())
  if (!readiness.available) {
    readiness = readNativeReadiness(await bridge.prepare())
  }

  if (!readiness.available) {
    throw new Error(readiness.reason)
  }
}

export async function readRuntimeHealth(apiBase: string): Promise<RuntimeHealth> {
  const platform = getRuntimePlatform()
  if (platform === 'android' || platform === 'ios') {
    if (!Capacitor.isPluginAvailable(NATIVE_PLUGIN_NAME)) {
      return {
        platform,
        runtime: 'native-runtime',
        model: 'qwen3.5-0.8b-q5_K_M',
        phase: 'unavailable',
        available: false,
        modelInstalled: false,
        reason: 'native-ai-plugin-unavailable',
      }
    }

    try {
      return parseRuntimeHealth(await MemoirRuntime.health(), platform)
    } catch {
      return {
        platform,
        runtime: 'native-runtime',
        model: 'qwen3.5-0.8b-q5_K_M',
        phase: 'failed',
        available: false,
        modelInstalled: false,
        reason: 'native-ai-health-failed',
      }
    }
  }

  const response = await fetch(`${apiBase}/health`, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Local AI health failed (${response.status})`)
  }

  return parseRuntimeHealth(await response.json(), platform)
}

export async function rewriteWithRuntime(input: {
  apiBase: string
  tone: Tone
  text: string
  bridge?: NativeRuntimeBridge
}): Promise<unknown> {
  const bridge = input.bridge || getNativeRuntimeBridge()
  if (bridge) {
    await ensureNativeRuntimeReady(bridge)
    return bridge.rewrite({
      jobId: `rewrite-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tone: input.tone,
      text: input.text,
    })
  }

  if (isNativeRuntimePlatform()) {
    throw new Error('native-ai-plugin-unavailable')
  }

  const response = await fetch(`${input.apiBase}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'rewrite-block',
      tone: input.tone,
      text: input.text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Section rewrite failed (${response.status})`)
  }

  return response.json()
}
