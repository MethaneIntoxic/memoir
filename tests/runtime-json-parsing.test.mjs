import assert from 'node:assert/strict'
import test from 'node:test'
import { collectJsonObjectCandidates, parseModelJsonResponse } from '../server/runtime/json-parser.mjs'

test('parseModelJsonResponse accepts direct JSON objects', () => {
  assert.deepEqual(parseModelJsonResponse('{"text":"hello"}'), { text: 'hello' })
})

test('parseModelJsonResponse recovers JSON from fenced content', () => {
  const content = '```json\n{"title":"Memoir","sections":[]}\n```'
  assert.deepEqual(parseModelJsonResponse(content), { title: 'Memoir', sections: [] })
})

test('parseModelJsonResponse recovers JSON from prose-wrapped content', () => {
  const content = 'Here is the draft:\n{"summary":"A quiet day","sections":[]}\nHope this helps.'
  assert.deepEqual(parseModelJsonResponse(content), { summary: 'A quiet day', sections: [] })
})

test('parseModelJsonResponse skips invalid brace groups before valid JSON', () => {
  const content = 'Template {not valid json} final payload {"quote":"Keep it close"}'
  assert.deepEqual(parseModelJsonResponse(content), { quote: 'Keep it close' })
})

test('collectJsonObjectCandidates respects braces inside strings', () => {
  const candidates = collectJsonObjectCandidates('{"text":"value with { braces }"} trailing')
  assert.deepEqual(candidates, ['{"text":"value with { braces }"}'])
})

test('parseModelJsonResponse rejects oversize payloads', () => {
  const content = `{${'a'.repeat(262145)}}`
  assert.throws(
    () => parseModelJsonResponse(content, { provider: 'Embedded runtime' }),
    /Embedded runtime returned too much data to parse safely\./,
  )
})

test('parseModelJsonResponse rejects arrays and malformed payloads', () => {
  assert.throws(() => parseModelJsonResponse('[1,2,3]'), /Model returned invalid JSON\./)
  assert.throws(() => parseModelJsonResponse('no json here'), /Model returned invalid JSON\./)
})

test('parseModelJsonResponse rejects empty content', () => {
  assert.throws(() => parseModelJsonResponse('   '), /Model returned an empty response\./)
})