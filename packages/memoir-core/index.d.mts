export type Tone = 'romantic' | 'playful' | 'diary' | 'editorial'
export type Theme = 'noir-journal' | 'soft-archive' | 'film-notes'

export type Asset = {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

export type Section = {
  id: string
  assetId: string
  caption: string
  body: string
}

export type MemoirDiagnostics = {
  backend: string
  model: string
  reason: string
  runtime?: string
  stage?: string
  generatedAt?: string
  available?: boolean
  modelInstalled?: boolean
  assetCount?: number
  inputWarnings?: string[]
  storyQualityWarnings?: string[]
}

export type Memoir = {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  summary: string
  quote: string
  tone: Tone
  theme: Theme
  notes: string
  musicCue: string
  assets: Asset[]
  sections: Section[]
  diagnostics: MemoirDiagnostics
}

export type GenerateMemoirPayload = {
  title: string
  summary: string
  quote: string
  sections: Section[]
  diagnostics: MemoirDiagnostics
}

export type MemoirDiagnosticsExportPayload = {
  memoirId: string
  title: string
  createdAt: string
  updatedAt: string
  tone: Tone
  theme: Theme
  assetCount: number
  assets: Array<{
    id: string
    name: string
    width: number
    height: number
  }>
  diagnostics: MemoirDiagnostics
  prototype: {
    storage: string
    encryptedAtRest: false
    exportFormats: string[]
  }
}

export type PortableMemoirResult = {
  manifest: Record<string, unknown>
  memoir: Memoir
  diagnostics: unknown
  exportMetadata: unknown
}

export const PORTABLE_MEMOIR_FORMAT: 'com.memoir.portable'
export const PORTABLE_MEMOIR_MIME: 'application/vnd.memoir+zip'
export const PORTABLE_MEMOIR_VERSION: 1
export const mobileRuntimeManifests: Record<
  'android' | 'ios',
  {
    modelId: string
    runtimeId: string
    quantization: string
    modelFileName: string
    modelSha256: string
    modelSizeBytes: number
    mmprojFileName: string
    mmprojSha256: string
    mmprojSizeBytes: number
    contextSize: number
    maxTokens: number
    minimumMemoryClass: string
    deliveryMode: string
  }
>
export const nativeBridgeContracts: Record<string, string[]>
export const releaseArtifacts: Record<string, { kind: string; extension: string; storeUpload: boolean }>
export const themes: Theme[]
export const tones: Tone[]

export function buildDiagnosticsFileName(title: string): string
export function buildMemoirDiagnosticsExport(memoir: Memoir): MemoirDiagnosticsExportPayload
export function buildMemoirFileName(title: string, extension?: string): string
export function buildPortableMemoirArchive(memoir: Memoir): Uint8Array
export function buildPortableMemoirFileName(title: string): string
export function escapeHtml(text: string): string
export function normalizeApiBase(value: string): string
export function parseGenerateMemoirPayload(value: unknown): GenerateMemoirPayload | null
export function parseMemoir(value: unknown): Memoir | null
export function parseMemoirList(value: unknown): Memoir[]
export function parsePortableMemoirArchive(bytes: ArrayBuffer | Uint8Array): PortableMemoirResult
export function parseRewriteText(value: unknown): string | null
export function renderMemoirDiagnosticsJson(memoir: Memoir): string
export function renderMemoirHtml(memoir: Memoir): string
