import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { verifyPackagedDistribution } from '../scripts/packaged-smoke.mjs'
import { TIERS, toManifest } from '../scripts/prepare-desktop-model.mjs'

test('desktop model prep manifest selects Qwen3-VL Q4 for the portable EXE tier', () => {
  const manifest = toManifest('qwen3vl-q4', TIERS['qwen3vl-q4'])

  assert.equal(manifest.modelId, 'qwen3-vl-2b-instruct-q4_K_M')
  assert.equal(manifest.relativeModelPath, 'models/Qwen3VL-2B-Instruct-Q4_K_M.gguf')
  assert.equal(manifest.relativeMmprojPath, 'models/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf')
  assert.equal(manifest.relativeReadyMarker, 'models/Qwen3VL-2B-Instruct-Q4_K_M.ready')
  assert.equal(manifest.contextSize, 8192)
  assert.equal(manifest.sizeBytes, 1107409952)
  assert.equal(manifest.mmprojSizeBytes, 445053216)
})

test('verifyPackagedDistribution accepts a complete unpacked Memoir distribution', async () => {
  const fixtureRoot = await createPackagedFixture()

  try {
    const result = await verifyPackagedDistribution({
      exePath: path.join(fixtureRoot, 'Memoir.exe'),
    })

    assert.equal(result.ok, true)
    assert.deepEqual(result.missing, [])
    assert.deepEqual(result.invalid, [])
    assert.equal(result.exePath, path.join(fixtureRoot, 'Memoir.exe'))
    assert.equal(result.resourcesDir, path.join(fixtureRoot, 'resources'))
    assert.equal(result.runtimeDir, path.join(fixtureRoot, 'resources', 'memoir-runtime'))
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

test('verifyPackagedDistribution reports missing bundled files and unresolved manifest paths', async () => {
  const fixtureRoot = await createPackagedFixture({
    skipModel: true,
    manifest: {
      modelId: 'gemma4:e2b-instruct-q4_K_M',
      relativeModelPath: 'models/missing-model.gguf',
      relativeMmprojPath: 'models/missing-mmproj.gguf',
      relativeReadyMarker: 'models/missing.ready',
    },
  })

  try {
    const result = await verifyPackagedDistribution({
      exePath: path.join(fixtureRoot, 'Memoir.exe'),
    })

    assert.equal(result.ok, false)
    assert.equal(result.missing.includes('resources/memoir-runtime/models/missing-model.gguf'), true)
    assert.equal(result.missing.includes('resources/memoir-runtime/models/missing-mmproj.gguf'), true)
    assert.equal(result.missing.includes('resources/memoir-runtime/models/missing.ready'), true)
    assert.equal(result.invalid.includes('manifest relativeModelPath does not resolve to a file'), true)
    assert.equal(result.invalid.includes('manifest relativeMmprojPath does not resolve to a file'), true)
    assert.equal(result.invalid.includes('manifest relativeReadyMarker does not resolve to a file'), true)
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

async function createPackagedFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'memoir-packaged-smoke-'))
  const resourcesDir = path.join(root, 'resources')
  const runtimeDir = path.join(resourcesDir, 'memoir-runtime')
  const modelsDir = path.join(runtimeDir, 'models')

  await mkdir(path.join(resourcesDir, 'server'), { recursive: true })
  await mkdir(path.join(resourcesDir, 'app', 'dist'), { recursive: true })
  await mkdir(path.join(runtimeDir, 'llama'), { recursive: true })
  await mkdir(modelsDir, { recursive: true })

  await writeFile(path.join(root, 'Memoir.exe'), 'exe')
  await writeFile(path.join(root, 'chrome_100_percent.pak'), 'chrome-100')
  await writeFile(path.join(root, 'chrome_200_percent.pak'), 'chrome-200')
  await writeFile(path.join(root, 'resources.pak'), 'resources')
  await writeFile(path.join(root, 'icudtl.dat'), 'icu')
  await writeFile(path.join(resourcesDir, 'app.asar'), 'asar')
  await writeFile(path.join(resourcesDir, 'server', 'server.mjs'), 'server')
  await writeFile(path.join(resourcesDir, 'app', 'dist', 'index.html'), '<div id="root"></div>')
  await writeFile(path.join(runtimeDir, 'llama', 'llama-server.exe'), 'llama')

  const manifest = options.manifest || {
    modelId: 'gemma4:e2b-instruct-q4_K_M',
    relativeModelPath: 'models/model.gguf',
    relativeMmprojPath: 'models/mmproj.gguf',
    relativeReadyMarker: 'models/model.ready',
  }
  await writeFile(path.join(runtimeDir, 'memoir-default-model.json'), JSON.stringify(manifest, null, 2))

  if (!options.skipModel) {
    await writeFile(path.join(modelsDir, 'model.gguf'), 'model')
    await writeFile(path.join(modelsDir, 'mmproj.gguf'), 'mmproj')
    await writeFile(path.join(modelsDir, 'model.ready'), 'ready')
  }

  return root
}
