import { readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { encodeZip } from '../packages/memoir-core/zip-store.mjs'

const rootDir = process.cwd()
const appDistDir = path.join(rootDir, 'app', 'dist')
const outputDir = path.join(rootDir, 'dist', 'web')
const outputPath = path.join(outputDir, 'memoir-web.zip')

async function collectFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath)))
      continue
    }

    if (entry.isFile()) {
      files.push({
        path: relativePath.replaceAll(path.sep, '/'),
        content: new Uint8Array(await readFile(absolutePath)),
      })
    }
  }

  return files
}

const files = await collectFiles(appDistDir)
if (!files.some((file) => file.path === 'index.html')) {
  throw new Error('web-build-missing-index')
}

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, encodeZip(files))

console.log(
  JSON.stringify(
    {
      ok: true,
      outputPath,
      fileCount: files.length,
    },
    null,
    2,
  ),
)
