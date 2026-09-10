import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMemoirSlides,
  exportInstagramFeedSlides,
  renderInstagramFeedSlideFiles,
} from '../packages/memoir-core/index.mjs'
import { decodeZip } from '../packages/memoir-core/zip-store.mjs'
import { createSampleMemoir } from '../app/src/memoir/test-fixtures.ts'

test('buildMemoirSlides keeps chapter order and escapes display text', () => {
  const memoir = createSampleMemoir()
  memoir.title = '<Trip & Train>'
  memoir.sections[1] = {
    ...memoir.sections[1],
    caption: 'Glass & <gold>',
  }

  const slides = buildMemoirSlides(memoir)

  assert.equal(slides.length, 3)
  assert.deepEqual(
    slides.map((slide) => slide.index),
    [1, 2, 3],
  )
  assert.equal(slides[0].title, '&lt;Trip &amp; Train&gt;')
  assert.equal(slides[1].caption, 'Glass &amp; &lt;gold&gt;')
  assert.equal(slides[0].width, 1080)
  assert.equal(slides[0].height, 1350)
  assert.equal(slides[0].aspectRatio, '4:5')
})

test('exportInstagramFeedSlides renders 1080x1350 PNG entries in chapter order', async () => {
  const memoir = createSampleMemoir()
  const rendered = []

  const zipBytes = await exportInstagramFeedSlides(memoir, {
    renderSlide: async (slide) => {
      rendered.push(`${slide.index}:${slide.asset.name}:${slide.width}x${slide.height}`)
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, slide.index])
    },
  })
  const entries = decodeZip(zipBytes)

  assert.deepEqual(rendered, [
    '1:frame-1.jpg:1080x1350',
    '2:frame-2.jpg:1080x1350',
    '3:frame-3.jpg:1080x1350',
  ])
  assert.deepEqual([...entries.keys()], [
    'manifest.json',
    'slides/01-train-window-keepsake.png',
    'slides/02-train-window-keepsake.png',
    'slides/03-train-window-keepsake.png',
  ])

  const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')))
  assert.equal(manifest.format, 'com.memoir.instagram-feed-slides')
  assert.equal(manifest.width, 1080)
  assert.equal(manifest.height, 1350)
  assert.equal(manifest.slideCount, 3)
})

test('renderInstagramFeedSlideFiles exposes ordered PNGs for native carousel sharing', async () => {
  const memoir = createSampleMemoir()
  const rendered = []

  const files = await renderInstagramFeedSlideFiles(memoir, {
    renderSlide(slide) {
      rendered.push(`${slide.index}:${slide.width}x${slide.height}`)
      return new Uint8Array([slide.index, slide.count])
    },
  })

  assert.deepEqual(rendered, ['1:1080x1350', '2:1080x1350', '3:1080x1350'])
  assert.deepEqual(files.map((file) => file.name), [
    '01-train-window-keepsake.png',
    '02-train-window-keepsake.png',
    '03-train-window-keepsake.png',
  ])
  assert.ok(files.every((file) => file.mimeType === 'image/png'))
  assert.deepEqual([...files[2].content], [3, 3])
})
