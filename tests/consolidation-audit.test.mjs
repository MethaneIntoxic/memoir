import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { collectConsolidationCandidates } from '../scripts/consolidation-audit.mjs'

test('consolidation audit excludes the canonical root and dependency folders', async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'memoir-consolidation-'))
  const canonicalRoot = path.join(fixtureRoot, 'memoir')
  const externalRoot = path.join(fixtureRoot, 'memoir-copy')

  try {
    await mkdir(path.join(canonicalRoot, 'app'), { recursive: true })
    await mkdir(path.join(canonicalRoot, 'node_modules', 'memoir-lib'), { recursive: true })
    await mkdir(externalRoot, { recursive: true })
    await writeFile(path.join(canonicalRoot, 'package.json'), '{"name":"memoir"}')
    await writeFile(path.join(canonicalRoot, 'node_modules', 'memoir-lib', 'package.json'), '{"name":"memoir-lib"}')
    await writeFile(path.join(externalRoot, 'package.json'), '{"name":"memoir"}')

    const candidates = await collectConsolidationCandidates({
      canonicalRoot,
      searchRoots: [fixtureRoot],
      maxDepth: 3,
    })

    assert.deepEqual(
      candidates.map((candidate) => path.basename(candidate.path)),
      ['memoir-copy'],
    )
    assert.equal(candidates[0].fileCount, 1)
    assert.equal(candidates[0].totalBytes, 17)
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})
