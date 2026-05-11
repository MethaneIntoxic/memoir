import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagedRuntimeDir = path.join(rootDir, 'desktop', 'dist', 'win-unpacked', 'resources', 'memoir-runtime')
const packagedServerPath = path.join(rootDir, 'desktop', 'dist', 'win-unpacked', 'resources', 'server', 'server.mjs')
const smokeTimeoutMs = Number(process.env.MEMOIR_QUALITY_SMOKE_TIMEOUT_MS || 240000)

function chooseSmokePort() {
  return 21877 + Math.floor(Math.random() * 1000)
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function readImageDataUrl(relativePath) {
  const absolutePath = path.join(rootDir, relativePath)
  const extension = path.extname(absolutePath).toLowerCase()
  const mime = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png'

  return `data:${mime};base64,${readFileSync(absolutePath).toString('base64')}`
}

function hasLoopingText(value) {
  const text = JSON.stringify(value)
    .replace(/\s+/g, ' ')
    .trim()
  const chunks = text.match(/\b[A-Za-z][A-Za-z'-]{3,}\b/g) || []
  const counts = new Map()

  for (const chunk of chunks) {
    const key = chunk.toLowerCase()
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return [...counts.values()].some((count) => count >= 18)
}

async function waitForHealth(port) {
  const startedAt = Date.now()
  let lastHealth = null

  while (Date.now() - startedAt < smokeTimeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(2000),
      })

      if (response.ok) {
        lastHealth = await response.json()
        if (lastHealth.runtime === 'embedded-llama' && lastHealth.available && lastHealth.modelInstalled) {
          return lastHealth
        }
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(500)
  }

  throw new Error(`quality smoke runtime did not become ready: ${JSON.stringify(lastHealth)}`)
}

async function requestDraft(port) {
  const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(smokeTimeoutMs),
    body: JSON.stringify({
      tone: 'diary',
      notes: 'A quiet app icon study for a small local memoir tool.',
      musicCue: 'soft piano',
      assets: [
        {
          id: 'asset-1',
          name: 'memoir-icon-192.png',
          dataUrl: readImageDataUrl('app/public/icons/memoir-icon-192.png'),
        },
      ],
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`quality smoke generate failed: ${response.status} ${JSON.stringify(payload)}`)
  }

  return payload
}

function validateDraft(payload, health) {
  const invalid = []
  const sections = Array.isArray(payload?.sections) ? payload.sections : []

  if (payload?.diagnostics?.backend !== 'embedded-llama') {
    invalid.push(`expected embedded-llama backend, got ${payload?.diagnostics?.backend || 'missing'}`)
  }

  if (payload?.diagnostics?.reason !== 'live-model') {
    invalid.push(`expected live-model reason, got ${payload?.diagnostics?.reason || 'missing'}`)
  }

  if (payload?.diagnostics?.model !== health.model) {
    invalid.push(`expected diagnostics model ${health.model}, got ${payload?.diagnostics?.model || 'missing'}`)
  }

  if (sections.length !== 1) {
    invalid.push(`expected 1 generated section, got ${sections.length}`)
  }

  for (const key of ['title', 'summary', 'quote']) {
    if (typeof payload?.[key] !== 'string' || !payload[key].trim()) {
      invalid.push(`missing ${key}`)
    }
  }

  if (hasLoopingText(payload)) {
    invalid.push('generated payload appears to contain looping text')
  }

  return invalid
}

async function runQualitySmoke() {
  if (!existsSync(packagedRuntimeDir) || !existsSync(packagedServerPath)) {
    throw new Error('packaged desktop runtime is missing; run npm run dist:desktop:single-file first')
  }

  const port = chooseSmokePort()
  const embeddedPort = port + 1000
  const child = spawn(process.execPath, [packagedServerPath], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEMOIR_PORT: String(port),
      MEMOIR_RUNTIME: 'embedded-llama',
      MEMOIR_EMBEDDED_RESOURCES_DIR: packagedRuntimeDir,
      MEMOIR_EMBEDDED_PORT: String(embeddedPort),
      MEMOIR_EMBEDDED_STARTUP_TIMEOUT_MS: String(smokeTimeoutMs),
      MEMOIR_REQUEST_TIMEOUT_MS: String(smokeTimeoutMs),
    },
    stdio: 'pipe',
    windowsHide: true,
  })

  let output = ''
  child.stdout.on('data', (chunk) => {
    output += String(chunk).slice(0, 2000)
  })
  child.stderr.on('data', (chunk) => {
    output += String(chunk).slice(0, 4000)
  })

  try {
    const health = await waitForHealth(port)
    const draft = await requestDraft(port)
    const invalid = validateDraft(draft, health)
    const result = {
      ok: invalid.length === 0,
      port,
      embeddedPort,
      health: {
        runtime: health.runtime,
        model: health.model,
        modelInstalled: health.modelInstalled,
        mmprojAvailable: health.mmprojAvailable,
      },
      diagnostics: draft?.diagnostics,
      sectionCount: Array.isArray(draft?.sections) ? draft.sections.length : 0,
      invalid,
      output: output.trim().slice(-2000),
    }

    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) {
      process.exitCode = 1
    }
  } finally {
    if (!child.killed) {
      child.kill()
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runQualitySmoke()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

export { hasLoopingText, validateDraft }
