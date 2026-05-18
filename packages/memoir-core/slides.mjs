import { escapeHtml } from './html.mjs'
import { parseMemoir } from './schema.mjs'
import { encodeZip } from './zip-store.mjs'

const INSTAGRAM_FEED_SLIDE_WIDTH = 1080
const INSTAGRAM_FEED_SLIDE_HEIGHT = 1350
const INSTAGRAM_FEED_SLIDE_FORMAT = 'com.memoir.instagram-feed-slides'
const encoder = new TextEncoder()

function slugify(value, fallback = 'memoir') {
  return (
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || fallback
  )
}

function buildMemoirSlides(memoir) {
  const parsedMemoir = parseMemoir(memoir)
  if (!parsedMemoir) {
    throw new Error('invalid-memoir-slide-source')
  }

  const assetMap = new Map(parsedMemoir.assets.map((asset) => [asset.id, asset]))

  return parsedMemoir.sections.map((section, index) => {
    const asset = assetMap.get(section.assetId) ?? parsedMemoir.assets[index] ?? parsedMemoir.assets[0]

    return {
      id: section.id,
      index: index + 1,
      count: parsedMemoir.sections.length,
      width: INSTAGRAM_FEED_SLIDE_WIDTH,
      height: INSTAGRAM_FEED_SLIDE_HEIGHT,
      aspectRatio: '4:5',
      fileName: `slides/${String(index + 1).padStart(2, '0')}-${slugify(parsedMemoir.title)}.png`,
      title: escapeHtml(parsedMemoir.title),
      summary: escapeHtml(parsedMemoir.summary),
      quote: escapeHtml(parsedMemoir.quote),
      tone: parsedMemoir.tone,
      theme: parsedMemoir.theme,
      caption: escapeHtml(section.caption),
      body: escapeHtml(section.body),
      rawTitle: parsedMemoir.title,
      rawSummary: parsedMemoir.summary,
      rawQuote: parsedMemoir.quote,
      rawCaption: section.caption,
      rawBody: section.body,
      asset,
    }
  })
}

async function exportInstagramFeedSlides(memoir, options = {}) {
  if (typeof options.renderSlide !== 'function') {
    throw new Error('instagram-slide-renderer-required')
  }

  const parsedMemoir = parseMemoir(memoir)
  if (!parsedMemoir) {
    throw new Error('invalid-instagram-slide-source')
  }

  const generatedAt = new Date().toISOString()
  const slides = buildMemoirSlides(parsedMemoir)
  const slideEntries = []

  for (const slide of slides) {
    const content = await options.renderSlide(slide)
    if (!(content instanceof Uint8Array)) {
      throw new Error(`invalid-instagram-slide-render:${slide.index}`)
    }

    slideEntries.push({
      path: slide.fileName,
      content,
    })
  }

  const manifest = {
    format: INSTAGRAM_FEED_SLIDE_FORMAT,
    generatedAt,
    title: parsedMemoir.title,
    width: INSTAGRAM_FEED_SLIDE_WIDTH,
    height: INSTAGRAM_FEED_SLIDE_HEIGHT,
    aspectRatio: '4:5',
    slideCount: slides.length,
    slides: slides.map((slide) => ({
      index: slide.index,
      path: slide.fileName,
      sectionId: slide.id,
      assetId: slide.asset.id,
    })),
  }

  return encodeZip([
    { path: 'manifest.json', content: encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`) },
    ...slideEntries,
  ])
}

export {
  INSTAGRAM_FEED_SLIDE_FORMAT,
  INSTAGRAM_FEED_SLIDE_HEIGHT,
  INSTAGRAM_FEED_SLIDE_WIDTH,
  buildMemoirSlides,
  exportInstagramFeedSlides,
}
