import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyPackagedDistribution } from './packaged-smoke.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'desktop', 'dist')
const unpackedExePath = path.join(distDir, 'win-unpacked', 'Memoir.exe')
const maxPortableExeBytes = 1_950_000_000
const healthTimeoutMs = Number(process.env.MEMOIR_SINGLE_FILE_HEALTH_TIMEOUT_MS || 120000)

function listTopLevelExeFiles(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((candidate) => candidate.toLowerCase().endsWith('.exe') && statSync(candidate).isFile())
}

function toPortablePath(value) {
  return value.split(path.sep).join('/')
}

function chooseSmokePort() {
  return 19877 + Math.floor(Math.random() * 1000)
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function readHealth(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(healthTimeoutMs),
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

async function waitForHealth(port) {
  const startedAt = Date.now()
  let lastHealth = null

  while (Date.now() - startedAt < healthTimeoutMs) {
    lastHealth = await readHealth(port)

    if (lastHealth?.runtime === 'embedded-llama' && lastHealth.available === true && lastHealth.modelInstalled === true) {
      return { ok: true, health: lastHealth }
    }

    await delay(500)
  }

  return { ok: false, health: lastHealth }
}

async function runEmbeddedHealthSmoke(runtimeDir, serverPath) {
  const port = chooseSmokePort()
  const embeddedPort = port + 1000
  const child = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEMOIR_PORT: String(port),
      MEMOIR_RUNTIME: 'embedded-llama',
      MEMOIR_EMBEDDED_RESOURCES_DIR: runtimeDir,
      MEMOIR_EMBEDDED_PORT: String(embeddedPort),
      MEMOIR_EMBEDDED_STARTUP_TIMEOUT_MS: String(healthTimeoutMs),
      MEMOIR_REQUEST_TIMEOUT_MS: String(healthTimeoutMs),
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
    return {
      ...health,
      port,
      embeddedPort,
      output: output.trim().slice(-4000),
    }
  } finally {
    if (!child.killed) {
      child.kill()
    }
  }
}

async function main() {
  const topLevelExeFiles = listTopLevelExeFiles(distDir)
  const artifacts = topLevelExeFiles.map((absolutePath) => ({
    path: toPortablePath(path.relative(rootDir, absolutePath)),
    bytes: statSync(absolutePath).size,
  }))
  const invalid = []

  if (artifacts.length !== 1) {
    invalid.push(`expected exactly one top-level portable EXE in desktop/dist, found ${artifacts.length}`)
  }

  for (const artifact of artifacts) {
    if (artifact.bytes > maxPortableExeBytes) {
      invalid.push(`${artifact.path} exceeds ${maxPortableExeBytes} bytes`)
    }
  }

  let packaged = null
  if (existsSync(unpackedExePath)) {
    packaged = await verifyPackagedDistribution({ exePath: unpackedExePath })
    if (!packaged.ok) {
      invalid.push(...packaged.missing.map((entry) => `missing ${entry}`))
      invalid.push(...packaged.invalid)
    }
  } else {
    invalid.push('desktop/dist/win-unpacked/Memoir.exe is missing; portable staging cannot be inspected')
  }

  let health = null
  if (packaged?.ok) {
    health = await runEmbeddedHealthSmoke(
      packaged.runtimeDir,
      path.join(packaged.resourcesDir, 'server', 'server.mjs'),
    )

    if (!health.ok) {
      invalid.push('packaged embedded runtime health did not report available modelInstalled true')
    }
  }

  const result = {
    ok: invalid.length === 0,
    target: 'desktop/dist/*.exe',
    maxPortableExeBytes,
    artifacts,
    packaged,
    health,
    invalid: [...new Set(invalid)],
  }

  console.log(JSON.stringify(result, null, 2))

  if (!result.ok) {
    process.exitCode = 1
  }
}

await main()
