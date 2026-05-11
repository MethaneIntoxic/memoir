import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMemoirDiagnosticsExport,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
} from './export.ts'
import { createSampleMemoir } from './test-fixtures.ts'

test('renderMemoirHtml escapes authored text while keeping the memoir structure intact', () => {
  const memoir = createSampleMemoir()
  memoir.title = '<script>alert(1)</script>'
  memoir.summary = 'A <b>quiet</b> return home.'
  memoir.sections[0] = {
    ...memoir.sections[0],
    caption: 'One & <Two>',
    body: 'The carriage stayed "gold" and calm.',
  }

  const html = renderMemoirHtml(memoir)

  assert.equal(html.includes('<script>alert(1)</script>'), false)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /One &amp; &lt;Two&gt;/)
  assert.match(html, /&quot;gold&quot;/)
})

test('diagnostics export stays pure and excludes raw image data', () => {
  const memoir = createSampleMemoir()
  const payload = buildMemoirDiagnosticsExport(memoir)
  const json = renderMemoirDiagnosticsJson(memoir)

  assert.equal(payload.assetCount, 3)
  assert.equal(payload.prototype.encryptedAtRest, false)
  assert.equal('dataUrl' in payload.assets[0], false)
  assert.match(json, /"storage": "browser-indexeddb"/)
  assert.equal(json.includes('data:image/jpeg'), false)
})