import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const resourcesDir = path.join(repoRoot, 'desktop', 'resources')
const modelsDir = path.join(resourcesDir, 'models')
const manifestPath = path.join(resourcesDir, 'memoir-default-model.json')

const TIERS = {
  'qwen3vl-q4': {
    modelId: 'qwen3-vl-2b-instruct-q4_K_M',
    runtimeModelId: 'Qwen3VL-2B-Instruct-Q4_K_M.gguf',
    version: '1.0.0',
    quantization: 'Q4_K_M',
    readyFileName: 'Qwen3VL-2B-Instruct-Q4_K_M.ready',
    contextSize: 8192,
    source: 'https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/main/Qwen3VL-2B-Instruct-Q4_K_M.gguf',
    sha256: '089D75C52F4B7FFC56BA998FFC50AAE89FCAFC755F9E7208AACCA281DCA6C2AE',
    sizeBytes: 1107409952,
    mmprojSource:
      'https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',
    mmprojFileName: 'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',
    mmprojSha256: 'F9A68FABBA69C3B81E153367B2C7521030B0FA8BB0DE400C9599C8E6725F9C82',
    mmprojSizeBytes: 445053216,
  },
  'qwen3vl-q3': {
    modelId: 'qwen3-vl-2b-instruct-q3_K_M',
    runtimeModelId: 'Qwen_Qwen3-VL-2B-Instruct-Q3_K_M.gguf',
    version: '1.0.0',
    quantization: 'Q3_K_M',
    readyFileName: 'Qwen_Qwen3-VL-2B-Instruct-Q3_K_M.ready',
    contextSize: 8192,
    source:
      'https://huggingface.co/bartowski/Qwen_Qwen3-VL-2B-Instruct-GGUF/resolve/main/Qwen_Qwen3-VL-2B-Instruct-Q3_K_M.gguf',
    sha256: 'D267D307BA7F3F1D1AB9EA195493805ACE695941C1CD84D297A03F8DD6EDD432',
    sizeBytes: 939539776,
    mmprojSource:
      'https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',
    mmprojFileName: 'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',
    mmprojSha256: 'F9A68FABBA69C3B81E153367B2C7521030B0FA8BB0DE400C9599C8E6725F9C82',
    mmprojSizeBytes: 445053216,
  },
}

function parseArgs(argv) {
  const parsed = {
    tier: process.env.MEMOIR_DESKTOP_MODEL_TIER || '',
    skipDownload: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--tier') {
      parsed.tier = argv[index + 1] || parsed.tier
      index += 1
    } else if (arg.startsWith('--tier=')) {
      parsed.tier = arg.slice('--tier='.length)
    } else if (arg === '--skip-download') {
      parsed.skipDownload = true
    }
  }

  return parsed
}

function toManifest(tierName, tier) {
  return {
    modelId: tier.modelId,
    runtimeModelId: tier.runtimeModelId,
    version: tier.version,
    quantization: tier.quantization,
    relativeModelPath: `models/${tier.runtimeModelId}`,
    relativeMmprojPath: `models/${tier.mmprojFileName}`,
    relativeReadyMarker: `models/${tier.readyFileName}`,
    sha256: tier.sha256,
    sizeBytes: tier.sizeBytes,
    mmprojSha256: tier.mmprojSha256,
    mmprojSizeBytes: tier.mmprojSizeBytes,
    contextSize: tier.contextSize,
    bundled: true,
    runtime: 'embedded-llama',
    tier: tierName,
    source: tier.source,
    mmprojSource: tier.mmprojSource,
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`
}

async function readExistingManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    return null
  }
}

async function hashFile(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }
  return hash.digest('hex').toUpperCase()
}

async function verifyFile(asset) {
  if (!existsSync(asset.filePath)) {
    return { ok: false, reason: 'missing' }
  }

  const { stat } = await import('node:fs/promises')
  const fileStat = await stat(asset.filePath)
  if (fileStat.size !== asset.sizeBytes) {
    return { ok: false, reason: `size-mismatch:${fileStat.size}` }
  }

  const actualSha256 = await hashFile(asset.filePath)
  if (actualSha256 !== asset.sha256) {
    return { ok: false, reason: `sha256-mismatch:${actualSha256}` }
  }

  return { ok: true, reason: 'verified' }
}

async function downloadAsset(asset) {
  const response = await fetch(asset.url)
  if (!response.ok || !response.body) {
    throw new Error(`download failed for ${asset.fileName}: ${response.status} ${response.statusText}`)
  }

  const tmpPath = `${asset.filePath}.download`
  await rm(tmpPath, { force: true })

  console.log(`Downloading ${asset.fileName} (${formatBytes(asset.sizeBytes)})`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tmpPath))
  await rename(tmpPath, asset.filePath)
}

async function ensureAsset(asset, options) {
  const before = await verifyFile(asset)
  if (before.ok) {
    console.log(`Verified ${asset.fileName}`)
    return
  }

  if (options.skipDownload) {
    throw new Error(`${asset.fileName} is not ready: ${before.reason}`)
  }

  await downloadAsset(asset)
  const after = await verifyFile(asset)
  if (!after.ok) {
    throw new Error(`${asset.fileName} failed verification after download: ${after.reason}`)
  }

  console.log(`Verified ${asset.fileName}`)
}

async function writeManifestAndReady(tierName, tier) {
  const manifest = toManifest(tierName, tier)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(path.join(modelsDir, tier.readyFileName), 'ready\n')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const currentManifest = await readExistingManifest()
  const tierName = options.tier || currentManifest?.tier || 'qwen3vl-q4'
  const tier = TIERS[tierName]

  if (!tier) {
    throw new Error(`Unknown desktop model tier "${tierName}". Expected one of: ${Object.keys(TIERS).join(', ')}`)
  }

  await mkdir(modelsDir, { recursive: true })

  if (currentManifest?.tier && currentManifest.tier !== tierName) {
    console.log(`Switching desktop model tier from ${currentManifest.tier} to ${tierName}`)
  }

  const assets = [
    {
      fileName: tier.runtimeModelId,
      filePath: path.join(modelsDir, tier.runtimeModelId),
      url: tier.source,
      sha256: tier.sha256,
      sizeBytes: tier.sizeBytes,
    },
    {
      fileName: tier.mmprojFileName,
      filePath: path.join(modelsDir, tier.mmprojFileName),
      url: tier.mmprojSource,
      sha256: tier.mmprojSha256,
      sizeBytes: tier.mmprojSizeBytes,
    },
  ]

  await rm(path.join(modelsDir, tier.readyFileName), { force: true })

  for (const asset of assets) {
    await ensureAsset(asset, options)
  }

  await writeManifestAndReady(tierName, tier)

  console.log(
    JSON.stringify(
      {
        ok: true,
        tier: tierName,
        manifestPath: path.relative(repoRoot, manifestPath).replaceAll(path.sep, '/'),
        totalModelBytes: tier.sizeBytes + tier.mmprojSizeBytes,
      },
      null,
      2,
    ),
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

export { TIERS, toManifest }
