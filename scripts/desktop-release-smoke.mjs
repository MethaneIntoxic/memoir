import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const desktopDir = path.join(rootDir, 'desktop')
const distDir = path.join(desktopDir, 'dist')
const desktopPackage = JSON.parse(readFileSync(path.join(desktopDir, 'package.json'), 'utf8'))
const version = String(desktopPackage.version || '0.0.0')
const expectedZip = path.join(distDir, `Memoir-${version}-win.zip`)

function listTopLevelExeFiles(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return []
  }

  return readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((candidate) => candidate.toLowerCase().endsWith('.exe') && statSync(candidate).isFile())
}

function artifact(absolutePath) {
  return {
    path: path.relative(rootDir, absolutePath).replaceAll(path.sep, '/'),
    bytes: statSync(absolutePath).size,
  }
}

const artifacts = []
if (existsSync(expectedZip)) {
  artifacts.push(artifact(expectedZip))
}

for (const exePath of listTopLevelExeFiles(distDir)) {
  artifacts.push(artifact(exePath))
}

const result = {
  ok: artifacts.length > 0,
  target: `desktop/dist/Memoir-${version}-win.zip or desktop/dist/*.exe`,
  artifacts,
}

console.log(JSON.stringify(result, null, 2))

if (!result.ok) {
  process.exitCode = 1
}
