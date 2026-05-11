import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeApiBase, parseGenerateMemoirPayload, parseMemoir } from './validation.ts'
import { createSampleGeneratePayload, createSampleMemoir } from './test-fixtures.ts'

test('normalizeApiBase trims whitespace and trailing slashes', () => {
  assert.equal(normalizeApiBase(' http://localhost:8787/api/// '), 'http://localhost:8787/api')
  assert.equal(normalizeApiBase('   '), '/api')
})

test('parseGenerateMemoirPayload accepts the expected draft shape and rejects malformed payloads', () => {
  const payload = createSampleGeneratePayload()

  assert.deepEqual(parseGenerateMemoirPayload(payload), payload)
  assert.equal(parseGenerateMemoirPayload({ ...payload, sections: [{ assetId: 'asset-1' }] }), null)
})

test('parseMemoir accepts valid archive entries and rejects invalid section payloads', () => {
  const memoir = createSampleMemoir()

  assert.deepEqual(parseMemoir(memoir), memoir)
  assert.equal(parseMemoir({ ...memoir, sections: [{ id: 'section-1' }] }), null)
})

test('parseMemoir repairs loaded sections that point at missing assets', () => {
  const memoir = createSampleMemoir()
  const repaired = parseMemoir({
    ...memoir,
    sections: [
      {
        ...memoir.sections[0],
        assetId: 'missing-asset',
      },
    ],
  })

  assert.equal(repaired?.sections[0]?.assetId, 'asset-1')
})
