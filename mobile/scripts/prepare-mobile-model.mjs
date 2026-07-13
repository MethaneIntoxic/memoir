import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = path.resolve(mobileRoot, '..')
const manifest = JSON.parse(await readFile(path.join(mobileRoot, 'runtime-manifest.json'), 'utf8'))
const platformArgument = process.argv.find((argument) => argument.startsWith('--platform='))?.split('=')[1] || 'all'
if (!['all', 'android', 'ios'].includes(platformArgument)) {
  throw new Error('prepare-mobile-model --platform must be all, android, or ios')
}
const selectedRuntimes = platformArgument === 'all'
  ? [manifest.platforms.android, manifest.platforms.ios]
  : [manifest.platforms[platformArgument]]
const runtime = selectedRuntimes[0]
if (!runtime || selectedRuntimes.some((candidate) =>
  !candidate
  || candidate.modelFileName !== runtime.modelFileName
  || candidate.modelSource !== runtime.modelSource
  || candidate.modelSizeBytes !== runtime.modelSizeBytes
  || candidate.modelSha256.toUpperCase() !== runtime.modelSha256.toUpperCase())) {
  throw new Error('Android and iOS use different model assets; prepare each platform explicitly before packaging')
}
const modelsDirectory = path.join(repositoryRoot, 'desktop', 'resources', 'models')
const modelPath = path.join(modelsDirectory, runtime.modelFileName)
const temporaryPath = `${modelPath}.part`

async function sha256(filePath) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    digest.update(chunk)
  }
  return digest.digest('hex').toUpperCase()
}

async function isVerified(filePath) {
  if (!existsSync(filePath)) return false
  const file = await stat(filePath)
  if (file.size !== runtime.modelSizeBytes) return false
  return (await sha256(filePath)) === runtime.modelSha256.toUpperCase()
}

if (await isVerified(modelPath)) {
  console.log(`Pinned mobile model is ready: ${runtime.modelFileName}`)
  process.exit(0)
}

await mkdir(modelsDirectory, { recursive: true })
await rm(temporaryPath, { force: true })
const response = await fetch(runtime.modelSource, { redirect: 'follow' })
if (!response.ok || !response.body) {
  throw new Error(`Mobile model download failed (${response.status})`)
}

await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath, { flags: 'wx' }))
if (!(await isVerified(temporaryPath))) {
  await rm(temporaryPath, { force: true })
  throw new Error('Downloaded mobile model failed size or SHA-256 verification')
}

await rm(modelPath, { force: true })
await rename(temporaryPath, modelPath)
console.log(`Pinned mobile model prepared: ${runtime.modelFileName}`)
