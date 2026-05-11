import { spawn } from 'node:child_process'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { parseModelJsonResponse } from './json-parser.mjs'

const REQUEST_TIMEOUT_MS = Number(process.env.MEMOIR_REQUEST_TIMEOUT_MS || 60000)
const EMBEDDED_HOST = process.env.MEMOIR_EMBEDDED_HOST || '127.0.0.1'
const EMBEDDED_PORT = Number(process.env.MEMOIR_EMBEDDED_PORT || 8791)
const DEFAULT_BUNDLED_MODEL_ID = process.env.MEMOIR_BUNDLED_MODEL_ID || 'qwen3-vl-2b-instruct-q4_K_M'
const STARTUP_TIMEOUT_MS = Number(process.env.MEMOIR_EMBEDDED_STARTUP_TIMEOUT_MS || 30000)
const POLL_INTERVAL_MS = 200

function cleanValue(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function toAbsolutePath(basePath, targetPath) {
  const cleaned = cleanValue(targetPath, 400)
  if (!cleaned) {
    return ''
  }

  return path.isAbsolute(cleaned) ? cleaned : path.join(basePath, cleaned)
}

function readModelManifest(manifestPath) {
  const cleanedManifestPath = cleanValue(manifestPath, 400)
  if (!cleanedManifestPath || !existsSync(cleanedManifestPath)) {
    return null
  }

  try {
    const parsed = JSON.parse(readFileSync(cleanedManifestPath, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function getDefaultBinaryPath(resourcesDir) {
  return path.join(resourcesDir, 'llama', process.platform === 'win32' ? 'llama-server.exe' : 'llama-server')
}

function resolveEmbeddedRuntimeConfig(options = {}) {
  const resourcesDir =
    cleanValue(String(options.resourcesDir || process.env.MEMOIR_EMBEDDED_RESOURCES_DIR || ''), 400) || ''
  const manifestPath =
    cleanValue(String(options.manifestPath || process.env.MEMOIR_EMBEDDED_MODEL_MANIFEST || ''), 400) ||
    (resourcesDir ? path.join(resourcesDir, 'memoir-default-model.json') : '')
  const manifest = readModelManifest(manifestPath)
  const binaryPath =
    cleanValue(String(options.binaryPath || process.env.MEMOIR_EMBEDDED_BINARY_PATH || ''), 400) ||
    (resourcesDir ? getDefaultBinaryPath(resourcesDir) : '')
  const modelPath =
    cleanValue(String(options.modelPath || process.env.MEMOIR_EMBEDDED_MODEL_PATH || ''), 400) ||
    (manifest?.relativeModelPath && resourcesDir ? toAbsolutePath(resourcesDir, manifest.relativeModelPath) : '')
  const mmprojPath =
    cleanValue(String(options.mmprojPath || process.env.MEMOIR_EMBEDDED_MMPROJ_PATH || ''), 400) ||
    (manifest?.relativeMmprojPath && resourcesDir ? toAbsolutePath(resourcesDir, manifest.relativeMmprojPath) : '')
  const readyMarkerPath =
    cleanValue(String(options.readyMarkerPath || process.env.MEMOIR_EMBEDDED_READY_MARKER || ''), 400) ||
    (manifest?.relativeReadyMarker && resourcesDir ? toAbsolutePath(resourcesDir, manifest.relativeReadyMarker) : '')
  const modelId =
    cleanValue(String(options.modelId || manifest?.modelId || DEFAULT_BUNDLED_MODEL_ID), 120) ||
    DEFAULT_BUNDLED_MODEL_ID
  const runtimeModelId =
    cleanValue(String(options.runtimeModelId || manifest?.runtimeModelId || ''), 180) ||
    (modelPath ? path.basename(modelPath) : modelId)
  const contextSize =
    Number.isFinite(Number(options.contextSize || manifest?.contextSize)) &&
    Number(options.contextSize || manifest?.contextSize) > 0
      ? Math.floor(Number(options.contextSize || manifest?.contextSize))
      : 4096

  const modelPresent = Boolean(modelPath && existsSync(modelPath))
  const mmprojPresent = Boolean(mmprojPath && existsSync(mmprojPath))
  const readyMarkerPresent = readyMarkerPath ? existsSync(readyMarkerPath) : modelPresent

  return {
    runtimeId: 'embedded-llama',
    resourcesDir,
    manifestPath: manifestPath || undefined,
    manifest,
    binaryPath,
    modelPath,
    mmprojPath: mmprojPresent ? mmprojPath : '',
    readyMarkerPath,
    modelId,
    runtimeModelId,
    contextSize,
    host: EMBEDDED_HOST,
    port: EMBEDDED_PORT,
    bundled: true,
    bundleAvailable: Boolean(binaryPath && modelPresent && readyMarkerPresent && existsSync(binaryPath)),
    mmprojAvailable: mmprojPresent,
  }
}

function buildBaseHealth(config, overrides = {}) {
  return {
    runtime: 'embedded-llama',
    bundled: true,
    model: config.modelId,
    modelInstalled: config.bundleAvailable,
    models: config.bundleAvailable ? [config.modelId] : [],
    manifestPath: config.manifestPath,
    binaryPath: config.binaryPath,
    modelPath: config.modelPath,
    mmprojPath: config.mmprojPath || undefined,
    mmprojAvailable: config.mmprojAvailable,
    readyMarkerPath: config.readyMarkerPath,
    ...overrides,
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toOpenAiMessages(messages) {
  return messages.map((message) => {
    const baseMessage = {
      role: message.role,
    }

    const text = typeof message.content === 'string' ? message.content : ''
    const images = Array.isArray(message.images) ? message.images.filter(Boolean) : []

    if (!images.length) {
      baseMessage.content = text
      return baseMessage
    }

    baseMessage.content = [
      { type: 'text', text },
      ...images.map((image) => ({
        type: 'image_url',
        image_url: {
          url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
        },
      })),
    ]

    return baseMessage
  })
}

function verifyModelChecksum(config) {
  const expectedSha256 = config.manifest?.sha256
  if (!expectedSha256 || !config.modelPath || !existsSync(config.modelPath)) {
    return { verified: false, reason: 'no-checksum-or-model' }
  }

  try {
    const hash = createHash('sha256')
    const stream = createReadStream(config.modelPath)

    return new Promise((resolve) => {
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => {
        const actual = hash.digest('hex').toUpperCase()
        const expected = expectedSha256.toUpperCase()

        if (actual === expected) {
          resolve({ verified: true, reason: 'checksum-match' })
        } else {
          resolve({ verified: false, reason: 'checksum-mismatch', expected, actual })
        }
      })
      stream.on('error', () => {
        resolve({ verified: false, reason: 'checksum-read-error' })
      })
    })
  } catch {
    return { verified: false, reason: 'checksum-error' }
  }
}

function createEmbeddedLlamaProvider(options = {}) {
  const config = resolveEmbeddedRuntimeConfig(options)
  let childProcess = null
  let launchPromise = null
  let checksumVerified = false

  function isChildRunning() {
    return Boolean(childProcess && !childProcess.killed)
  }

  async function waitForServerReady() {
    const startedAt = Date.now()
    const baseUrl = `http://${config.host}:${config.port}`

    while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
      try {
        const response = await fetch(`${baseUrl}/v1/models`, {
          signal: AbortSignal.timeout(750),
        })

        if (response.ok) {
          return
        }
      } catch {
        // Ignore startup polling failures until timeout.
      }

      await delay(POLL_INTERVAL_MS)
    }

    throw new Error('embedded-runtime-timeout')
  }

  async function ensureStarted() {
    if (!config.bundleAvailable) {
      throw new Error('embedded-bundle-missing')
    }

    if (isChildRunning()) {
      return
    }

    if (launchPromise) {
      await launchPromise
      return
    }

    if (!checksumVerified && config.manifest?.sha256) {
      const result = await verifyModelChecksum(config)
      checksumVerified = true

      if (result.reason === 'checksum-mismatch') {
        throw new Error(`embedded-model-corrupted: expected ${result.expected}, got ${result.actual}`)
      }
    }

    const args = [
      '-m',
      config.modelPath,
      '--host',
      config.host,
      '--port',
      String(config.port),
      '--ctx-size',
      String(config.contextSize),
    ]

    if (config.mmprojPath) {
      args.push('--mmproj', config.mmprojPath)
    }

    childProcess = spawn(config.binaryPath, args, {
      stdio: 'ignore',
      windowsHide: true,
    })

    childProcess.once('exit', () => {
      childProcess = null
      launchPromise = null
    })

    launchPromise = waitForServerReady().finally(() => {
      launchPromise = null
    })
    await launchPromise
  }

  async function getHealth() {
    if (!config.bundleAvailable) {
      return buildBaseHealth(config, {
        available: false,
        reason: 'bundle-missing',
      })
    }

    try {
      await ensureStarted()
      const response = await fetch(`http://${config.host}:${config.port}/v1/models`, {
        signal: AbortSignal.timeout(1500),
      })

      if (!response.ok) {
        throw new Error(`models:${response.status}`)
      }

      const payload = await response.json()
      const models = Array.isArray(payload.data)
        ? payload.data.map((entry) => String(entry.id || '')).filter(Boolean)
        : []

      return buildBaseHealth(config, {
        available: true,
        models,
        modelInstalled: models.some((entry) => entry === config.runtimeModelId || entry.startsWith(config.runtimeModelId)),
      })
    } catch (error) {
      return buildBaseHealth(config, {
        available: false,
        reason: error instanceof Error ? cleanValue(error.message, 80) : 'embedded-runtime-error',
      })
    }
  }

  async function requestModel(messages) {
    await ensureStarted()

    const response = await fetch(`http://${config.host}:${config.port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify(buildEmbeddedChatRequestBody(config, messages)),
    })

    if (!response.ok) {
      const detail = cleanValue(await response.text(), 160)
      throw new Error(detail || `embedded-chat:${response.status}`)
    }

    const payload = await response.json()
    const content = String(payload.choices?.[0]?.message?.content || '').trim()
    return parseModelJsonResponse(content, { provider: 'Embedded runtime' })
  }

  return {
    runtimeId: 'embedded-llama',
    modelId: config.modelId,
    getConfig() {
      return config
    },
    getHealth,
    requestModel,
    stop() {
      if (childProcess && !childProcess.killed) {
        childProcess.kill()
      }

      childProcess = null
      launchPromise = null
    },
  }
}

function buildEmbeddedChatRequestBody(config, messages) {
  return {
    model: config.runtimeModelId,
    response_format: { type: 'json_object' },
    n_ctx: config.contextSize || 4096,
    messages: toOpenAiMessages(messages),
  }
}

export { DEFAULT_BUNDLED_MODEL_ID, buildEmbeddedChatRequestBody, createEmbeddedLlamaProvider, resolveEmbeddedRuntimeConfig }
