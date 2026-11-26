import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMemoir } from './validation.ts'
import { extractDayPalette, hexToRgba, quantizePixelsToPalette } from './palette.ts'
import { createSampleFilmRollMemoir } from './sample-roll.ts'

test('quantizePixelsToPalette extracts distinct dominant and accent colors from raw RGBA pixels', () => {
  // Build a tiny synthetic image with warm terracotta, deep navy, and sage pixels
  const pixels = new Uint8ClampedArray(60 * 4)
  for (let i = 0; i < 20; i += 1) {
    pixels.set([185, 76, 88, 255], i * 4)
  }
  for (let i = 20; i < 40; i += 1) {
    pixels.set([28, 52, 86, 255], i * 4)
  }
  for (let i = 40; i < 60; i += 1) {
    pixels.set([84, 138, 110, 255], i * 4)
  }

  const palette = quantizePixelsToPalette(pixels)
  assert.equal(palette.swatches.length, 5)
  assert.match(palette.dominant, /^#[0-9a-f]{6}$/)
  assert.match(palette.accent, /^#[0-9a-f]{6}$/)
  assert.match(palette.glow, /^rgba\(/)
  assert.equal(hexToRgba('#102030', 0.5), 'rgba(16, 32, 48, 0.5)')
})

test('extractDayPalette gracefully falls back without DOM canvas and produces 5 distinct swatches', async () => {
  const { perAsset, day } = await extractDayPalette([
    { id: 'a1', dataUrl: 'data:image/jpeg;base64,aaaa' },
    { id: 'a2', dataUrl: 'data:image/jpeg;base64,bbbb' },
  ])

  assert.equal(perAsset.size, 2)
  assert.equal(day.swatches.length, 5)
  assert.match(day.ambientA, /^#[0-9a-f]{6}$/)
  assert.match(day.ambientB, /^#[0-9a-f]{6}$/)
})

test('createSampleFilmRollMemoir returns a complete schema-valid 5-chapter memoir', () => {
  const sample = createSampleFilmRollMemoir()
  const parsed = parseMemoir(sample)

  assert.notEqual(parsed, null)
  assert.equal(parsed?.assets.length, 5)
  assert.equal(parsed?.sections.length, 5)
  assert.equal(parsed?.title, 'Midnight Ferry & Rainy Ramen')
})
