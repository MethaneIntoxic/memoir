import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import {
  buildMemoirDiagnosticsExport,
  buildPortableMemoirArchive,
  mobileRuntimeManifests,
  nativeBridgeContracts,
  parseGenerateMemoirPayload,
  parsePortableMemoirArchive,
  releaseArtifacts,
} from '../packages/memoir-core/index.mjs'
import { handleRequest, resetGenerationJobs, resetServerRuntimeOverrides, setServerRuntimeOverrides } from '../server/server.mjs'

function createSampleMemoir() {
  return {
    id: 'memoir-1',
    createdAt: '2026-04-25T12:00:00.000Z',
    updatedAt: '2026-04-25T12:00:00.000Z',
    title: 'Park Walk Keepsake',
    summary: 'A small day story carried through three frames.',
    quote: 'The day became real once it slowed down.',
    tone: 'romantic',
    theme: 'noir-journal',
    notes: 'A slow walk through the park after lunch.',
    musicCue: 'quiet piano',
    assets: [
      { id: 'asset-1', name: 'frame-1.jpg', dataUrl: 'data:image/jpeg;base64,aaaa', width: 960, height: 720 },
      { id: 'asset-2', name: 'frame-2.jpg', dataUrl: 'data:image/jpeg;base64,bbbb', width: 960, height: 720 },
      { id: 'asset-3', name: 'frame-3.jpg', dataUrl: 'data:image/jpeg;base64,cccc', width: 960, height: 720 },
    ],
    sections: [
      { id: 'section-1', assetId: 'asset-1', caption: 'The walk opens softly.', body: 'The first frame starts the day story.' },
      { id: 'section-2', assetId: 'asset-2', caption: 'The path starts to hold meaning.', body: 'The middle frame turns the outing into memory.' },
      { id: 'section-3', assetId: 'asset-3', caption: 'The afternoon lands gently.', body: 'The last frame closes the same story.' },
    ],
    diagnostics: {
      backend: 'fallback',
      runtime: 'embedded-llama',
      model: 'gemma4:e2b',
      reason: 'test-fixture',
      assetCount: 3,
    },
  }
}

function createRequest({
  method = 'GET',
  url = '/api/health',
  headers = {},
  body = '',
  remoteAddress = '127.0.0.1',
} = {}) {
  const request = Readable.from(body ? [body] : [])
  request.method = method
  request.url = url
  request.headers = headers
  request.socket = { remoteAddress }
  return request
}

function createResponse() {
  return {
    statusCode: 200,
    body: '',
    setHeader() {},
    writeHead(statusCode) {
      this.statusCode = statusCode
    },
    end(chunk = '') {
      this.body += chunk
    },
  }
}

async function invokeRequest(options) {
  const request = createRequest(options)
  const response = createResponse()
  await handleRequest(request, response)
  return {
    statusCode: response.statusCode,
    json: response.body ? JSON.parse(response.body) : null,
  }
}

test.beforeEach(() => {
  resetGenerationJobs()
  resetServerRuntimeOverrides()
})

test.afterEach(() => {
  resetGenerationJobs()
  resetServerRuntimeOverrides()
})

test('portable memoir archive round-trips a memoir with manifest, export metadata, and image assets', () => {
  const memoir = createSampleMemoir()
  const archive = buildPortableMemoirArchive(memoir)
  const parsed = parsePortableMemoirArchive(archive)

  assert.equal(parsed.manifest.format, 'com.memoir.portable')
  assert.equal(parsed.manifest.version, 1)
  assert.equal(parsed.manifest.assetCount, 3)
  assert.equal(parsed.exportMetadata.formats.includes('html'), true)
  assert.equal(parsed.memoir.title, memoir.title)
  assert.equal(parsed.memoir.assets[1].dataUrl, memoir.assets[1].dataUrl)
  assert.equal(parsed.memoir.sections[2].caption, memoir.sections[2].caption)
})

test('diagnostics export excludes raw image data and declares portable memoir support', () => {
  const payload = buildMemoirDiagnosticsExport(createSampleMemoir())

  assert.equal(payload.assetCount, 3)
  assert.equal(payload.prototype.exportFormats.includes('memoir'), true)
  assert.equal('dataUrl' in payload.assets[0], false)
  assert.equal(JSON.stringify(payload).includes('data:image/jpeg'), false)
})

test('release artifact and native bridge contracts encode the platform architecture', () => {
  assert.equal(releaseArtifacts.android.extension, 'apk')
  assert.equal(releaseArtifacts.ios.kind, 'xcode-archive')
  assert.deepEqual(nativeBridgeContracts.RuntimeAdapter, ['health', 'prepare', 'stageAsset', 'clearStagedAssets', 'generate', 'rewrite', 'cancel'])
  assert.deepEqual(nativeBridgeContracts.ExportAdapter, ['writeMemoir', 'writeHtml', 'writePdf', 'share'])
  assert.deepEqual(nativeBridgeContracts.MemoirRuntime, ['health', 'prepare', 'stageAsset', 'clearStagedAssets', 'generateMemoir', 'rewrite', 'cancelGeneration'])
})

test('mobile runtime manifests target the Qwen3.5 0.8B Q5 local model tier', () => {
  for (const platform of ['android', 'ios']) {
    assert.equal(mobileRuntimeManifests[platform].modelId, 'qwen3.5-0.8b-q5_K_M')
    assert.equal(mobileRuntimeManifests[platform].quantization, 'Q5_K_M')
    assert.equal(mobileRuntimeManifests[platform].modelFileName, 'Qwen_Qwen3.5-0.8B-Q5_K_M.gguf')
    assert.match(mobileRuntimeManifests[platform].modelSource, /resolve\/6f447fc6494c4b0f7dc269f8c39da6c61555a0de\//)
    assert.doesNotMatch(mobileRuntimeManifests[platform].modelSource, /resolve\/main\//)
    assert.equal(mobileRuntimeManifests[platform].modelSizeBytes, 625860768)
    assert.equal(mobileRuntimeManifests[platform].maxTokens, platform === 'android' ? 392 : 768)
    assert.equal(mobileRuntimeManifests[platform].contextSize, platform === 'android' ? 2048 : 4096)
    assert.equal(mobileRuntimeManifests[platform].minimumMemoryClass, platform === 'android' ? '4gb-ram' : '8gb-ram')
    assert.equal(mobileRuntimeManifests[platform].deliveryMode, platform === 'android' ? 'direct-apk-assets' : 'bundled-app-resource')
  }
})

test('server compose output conforms to the shared generated memoir payload schema', async () => {
  setServerRuntimeOverrides({
    getOllamaHealth: async () => ({
      available: false,
      runtime: 'embedded-llama',
      model: 'gemma4:e2b',
      modelInstalled: false,
      models: [],
    }),
  })

  const response = await invokeRequest({
    method: 'POST',
    url: '/api/generate',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tone: 'romantic',
      notes: 'A slow walk through the park after lunch.',
      assets: createSampleMemoir().assets.map((asset) => ({ id: asset.id, dataUrl: asset.dataUrl })),
    }),
    remoteAddress: '127.0.0.20',
  })

  assert.equal(response.statusCode, 200)
  assert.notEqual(parseGenerateMemoirPayload(response.json), null)
})
