import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { releaseArtifacts } from '../packages/memoir-core/index.mjs'

test('release artifacts no longer expose a standalone web package', () => {
  assert.equal('web' in releaseArtifacts, false)
})

test('release readiness no longer gates on package:web output', async () => {
  const script = await readFile(new URL('../scripts/release-readiness.mjs', import.meta.url), 'utf8')
  const checklist = await readFile(new URL('../docs/12-store-release-checklist.md', import.meta.url), 'utf8')

  assert.equal(script.includes('dist/web/memoir-web.zip'), false)
  assert.equal(script.includes('web-package-script'), false)
  assert.equal(checklist.includes('npm run package:web'), false)
})
