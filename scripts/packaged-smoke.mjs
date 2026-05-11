import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_EXE_PATH = path.join(repoRoot, 'desktop', 'dist', 'win-unpacked', 'Memoir.exe')

const requiredRelativePaths = [
  'Memoir.exe',
  'chrome_100_percent.pak',
  'chrome_200_percent.pak',
  'icudtl.dat',
  'resources.pak',
  path.join('resources', 'app.asar'),
  path.join('resources', 'server', 'server.mjs'),
  path.join('resources', 'app', 'dist', 'index.html'),
  path.join('resources', 'memoir-runtime', 'memoir-default-model.json'),
  path.join('resources', 'memoir-runtime', 'llama', 'llama-server.exe'),
]

function toPortablePath(value) {
  return value.split(path.sep).join('/')
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readManifestPath(manifest, key) {
  return typeof manifest[key] === 'string' && manifest[key].trim() ? manifest[key].trim() : ''
}

function readManifestNumber(manifest, key) {
  const value = Number(manifest[key])
  return Number.isFinite(value) && value > 0 ? value : 0
}

async function readModelManifest(manifestPath, invalid) {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (!isRecord(manifest)) {
      invalid.push('model manifest is not a JSON object')
      return null
    }

    return manifest
  } catch {
    invalid.push('model manifest is not valid JSON')
    return null
  }
}

function collectMissingPath(rootDir, relativePath, missing) {
  const absolutePath = path.join(rootDir, relativePath)
  if (!existsSync(absolutePath)) {
    missing.push(toPortablePath(relativePath))
  }
}

function collectManifestReference(runtimeDir, relativePath, label, missing, invalid) {
  if (!relativePath) {
    invalid.push(`manifest ${label} is missing`)
    return
  }

  const absolutePath = path.resolve(runtimeDir, relativePath)
  const runtimeRoot = path.resolve(runtimeDir)
  const relativeToRuntime = path.relative(runtimeRoot, absolutePath)

  if (relativeToRuntime.startsWith('..') || path.isAbsolute(relativeToRuntime)) {
    invalid.push(`manifest ${label} escapes memoir-runtime`)
    return
  }

  if (!existsSync(absolutePath)) {
    missing.push(toPortablePath(path.join('resources', 'memoir-runtime', relativePath)))
    invalid.push(`manifest ${label} does not resolve to a file`)
  }

  return absolutePath
}

function collectExpectedSize(filePath, expectedBytes, label, invalid) {
  if (!filePath || !expectedBytes || !existsSync(filePath)) {
    return
  }

  const actualBytes = statSync(filePath).size
  if (actualBytes !== expectedBytes) {
    invalid.push(`manifest ${label} expected ${expectedBytes} bytes but found ${actualBytes}`)
  }
}

function listGgufFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return []
  }

  const results = []
  const entries = readdirSync(rootDir, { withFileTypes: true })

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      results.push(...listGgufFiles(absolutePath))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf')) {
      results.push(absolutePath)
    }
  }

  return results
}

async function verifyPackagedDistribution(options = {}) {
  const exePath = path.resolve(options.exePath || DEFAULT_EXE_PATH)
  const unpackedDir = path.dirname(exePath)
  const resourcesDir = path.join(unpackedDir, 'resources')
  const runtimeDir = path.join(resourcesDir, 'memoir-runtime')
  const manifestPath = path.join(runtimeDir, 'memoir-default-model.json')
  const missing = []
  const invalid = []

  for (const relativePath of requiredRelativePaths) {
    collectMissingPath(unpackedDir, relativePath, missing)
  }

  if (existsSync(manifestPath)) {
    const manifest = await readModelManifest(manifestPath, invalid)
    if (manifest) {
      const modelPath = collectManifestReference(
        runtimeDir,
        readManifestPath(manifest, 'relativeModelPath'),
        'relativeModelPath',
        missing,
        invalid,
      )
      const mmprojPath = collectManifestReference(
        runtimeDir,
        readManifestPath(manifest, 'relativeMmprojPath'),
        'relativeMmprojPath',
        missing,
        invalid,
      )
      collectManifestReference(
        runtimeDir,
        readManifestPath(manifest, 'relativeReadyMarker'),
        'relativeReadyMarker',
        missing,
        invalid,
      )

      collectExpectedSize(modelPath, readManifestNumber(manifest, 'sizeBytes'), 'sizeBytes', invalid)
      collectExpectedSize(mmprojPath, readManifestNumber(manifest, 'mmprojSizeBytes'), 'mmprojSizeBytes', invalid)
    }
  }

  const gemmaFiles = listGgufFiles(runtimeDir).filter((filePath) => path.basename(filePath).toLowerCase().includes('gemma'))
  if (gemmaFiles.length) {
    invalid.push(
      `Gemma GGUF files must not be bundled in the one-file runtime: ${gemmaFiles
        .map((filePath) => toPortablePath(path.relative(runtimeDir, filePath)))
        .join(', ')}`,
    )
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    exePath,
    unpackedDir,
    resourcesDir,
    runtimeDir,
    missing: [...new Set(missing)],
    invalid: [...new Set(invalid)],
  }
}

async function runCli() {
  const result = await verifyPackagedDistribution({
    exePath: process.argv[2] || DEFAULT_EXE_PATH,
  })

  console.log(JSON.stringify(result, null, 2))

  if (!result.ok) {
    process.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli()
}

export { DEFAULT_EXE_PATH, verifyPackagedDistribution }
