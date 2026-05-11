import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ignoredDirectoryNames = new Set([
  '.cache',
  '.codex',
  '.git',
  '.next',
  '.playwright-cli',
  '.vite',
  'appdata',
  'archive',
  'build',
  'dist',
  'dist-agent',
  'node_modules',
  'output',
  'target',
  'venv',
])

function normalizePath(value) {
  return path.resolve(value)
}

function isInside(parent, child) {
  const relative = path.relative(normalizePath(parent), normalizePath(child))
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function isSamePath(left, right) {
  return normalizePath(left).toLowerCase() === normalizePath(right).toLowerCase()
}

function shouldSkipDirectory(directoryPath, canonicalRoot) {
  const name = path.basename(directoryPath).toLowerCase()

  return (
    ignoredDirectoryNames.has(name) ||
    isSamePath(directoryPath, canonicalRoot) ||
    isInside(canonicalRoot, directoryPath)
  )
}

async function safeReadDir(directoryPath) {
  try {
    return await readdir(directoryPath, { withFileTypes: true })
  } catch {
    return []
  }
}

async function safeReadPackageName(directoryPath) {
  try {
    const packagePath = path.join(directoryPath, 'package.json')
    const packageStat = await stat(packagePath)
    if (!packageStat.isFile() || packageStat.size > 200_000) {
      return ''
    }

    const { readFile } = await import('node:fs/promises')
    const parsed = JSON.parse(await readFile(packagePath, 'utf8'))
    return typeof parsed?.name === 'string' ? parsed.name : ''
  } catch {
    return ''
  }
}

async function hashFile(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}

async function summarizeDirectory(directoryPath) {
  const files = []

  async function visit(currentPath) {
    const entries = await safeReadDir(currentPath)

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name)
      const lowerName = entry.name.toLowerCase()

      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(lowerName)) {
          await visit(absolutePath)
        }
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const fileStat = await stat(absolutePath)
      const relativePath = path.relative(directoryPath, absolutePath).split(path.sep).join('/')
      files.push({
        path: relativePath,
        bytes: fileStat.size,
        sha256: await hashFile(absolutePath),
      })
    }
  }

  await visit(directoryPath)

  const digest = createHash('sha256')
  for (const file of files.sort((left, right) => left.path.localeCompare(right.path))) {
    digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`)
  }

  return {
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    sha256: digest.digest('hex'),
    files,
  }
}

async function collectConsolidationCandidates({ canonicalRoot = repoRoot, searchRoots, maxDepth = 5 } = {}) {
  const roots = searchRoots?.length
    ? searchRoots
    : [
        path.join(os.homedir(), 'Desktop'),
        path.join(os.homedir(), 'Documents'),
        path.join(os.homedir(), 'Downloads'),
        path.join(os.homedir(), 'OneDrive'),
      ]
  const candidates = []
  const seen = new Set()

  async function visit(directoryPath, depth) {
    const resolved = normalizePath(directoryPath)
    const seenKey = resolved.toLowerCase()
    if (seen.has(seenKey) || depth > maxDepth || shouldSkipDirectory(resolved, canonicalRoot)) {
      return
    }

    seen.add(seenKey)

    const packageName = depth > 0 ? await safeReadPackageName(resolved) : ''
    const nameMatches = depth > 0 && path.basename(resolved).toLowerCase().includes('memoir')
    const packageMatches = depth > 0 && packageName.toLowerCase().includes('memoir')

    if (nameMatches || packageMatches) {
      const summary = await summarizeDirectory(resolved)
      candidates.push({
        path: resolved,
        reason: nameMatches ? 'path-name' : 'package-name',
        packageName: packageName || undefined,
        fileCount: summary.fileCount,
        totalBytes: summary.totalBytes,
        sha256: summary.sha256,
      })
      return
    }

    const entries = await safeReadDir(resolved)
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await visit(path.join(resolved, entry.name), depth + 1)
      }
    }
  }

  for (const root of roots) {
    await visit(root, 0)
  }

  return candidates.sort((left, right) => left.path.localeCompare(right.path))
}

function toArchiveName(candidatePath) {
  return candidatePath
    .replace(/^[A-Za-z]:/, '')
    .split(/[\\/]+/)
    .filter(Boolean)
    .join('__')
    .replace(/[^A-Za-z0-9._-]/g, '_')
}

async function writeConsolidationManifest({ canonicalRoot = repoRoot, searchRoots, archiveRoot, apply = false } = {}) {
  const timestamp = new Date().toISOString()
  const archiveStamp = timestamp.replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
  const archiveDir =
    archiveRoot || path.join(canonicalRoot, 'archive', `consolidation-${archiveStamp}`)
  const candidates = await collectConsolidationCandidates({ canonicalRoot, searchRoots })
  const moved = []

  await mkdir(archiveDir, { recursive: true })

  if (apply) {
    const candidateArchiveDir = path.join(archiveDir, 'candidates')
    await mkdir(candidateArchiveDir, { recursive: true })

    for (const candidate of candidates) {
      if (isInside(candidate.path, canonicalRoot) || isInside(canonicalRoot, candidate.path)) {
        throw new Error(`refusing to move path that overlaps canonical root: ${candidate.path}`)
      }

      const destination = path.join(candidateArchiveDir, toArchiveName(candidate.path))
      await rename(candidate.path, destination)
      moved.push({ from: candidate.path, to: destination })
    }
  }

  const manifest = {
    generatedAt: timestamp,
    canonicalRoot: normalizePath(canonicalRoot),
    mode: apply ? 'applied' : 'audit-only',
    candidates,
    moved,
  }

  const manifestPath = path.join(archiveDir, 'manifest.json')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  return {
    manifestPath,
    ...manifest,
  }
}

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const result = await writeConsolidationManifest({
    canonicalRoot: repoRoot,
    apply: options.apply,
  })

  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

export { collectConsolidationCandidates, writeConsolidationManifest }
