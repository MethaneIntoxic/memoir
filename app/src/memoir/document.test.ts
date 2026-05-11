import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoirDraft, moveMemoirSection, updateMemoirSection } from './document.ts'
import { createSampleAssets, createSampleGeneratePayload } from './test-fixtures.ts'

test('createMemoirDraft keeps payload diagnostics and selected inputs together', () => {
  const draft = createMemoirDraft({
    assets: createSampleAssets(),
    tone: 'editorial',
    theme: 'film-notes',
    notes: 'Platform light and a long ride home.',
    musicCue: 'Slow jazz',
    payload: createSampleGeneratePayload(),
  })

  assert.equal(draft.tone, 'editorial')
  assert.equal(draft.theme, 'film-notes')
  assert.equal(draft.sections.length, 3)
  assert.equal(draft.diagnostics.reason, 'live-model')
})

test('section updates stay local and section moves reorder the memoir body', () => {
  const original = createMemoirDraft({
    assets: createSampleAssets(),
    tone: 'romantic',
    theme: 'noir-journal',
    notes: 'Quiet carriage reflections.',
    musicCue: 'Station piano',
    payload: createSampleGeneratePayload(),
  })

  const updated = updateMemoirSection(original, 'section-2', 'caption', 'A sharper middle beat.')
  const moved = moveMemoirSection(updated, 'section-3', -1)
  const untouched = updateMemoirSection(original, 'missing-section', 'body', 'Should be ignored')

  assert.equal(updated.sections[1]?.caption, 'A sharper middle beat.')
  assert.equal(moved.sections[1]?.id, 'section-3')
  assert.equal(untouched, original)
})