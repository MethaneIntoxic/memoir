import {
  buildDiagnosticsFileName,
  buildMemoirDiagnosticsExport,
  buildMemoirFileName,
  buildPortableMemoirArchive,
  buildPortableMemoirFileName,
  exportInstagramFeedSlides,
  parsePortableMemoirArchive,
  PORTABLE_MEMOIR_MIME,
  renderInstagramFeedSlideFiles,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
  type Memoir,
  type MemoirDiagnosticsExportPayload,
  type MemoirSlide,
  type Theme,
} from '../../../packages/memoir-core/index.mjs'
import { deliverBinaryFile, deliverBinaryFiles, deliverTextFile, isNativeMobile } from '../platform/export-adapter.ts'
import { extractAssetPalette, extractDayPalette } from './palette.ts'

export type ExportVisualOptions = {
  includeStamp?: boolean
}

const EXPORT_STAMP_TEXT = 'MEMOIR 400 · memoir.memoir-press.workers.dev'

type SlidePaletteStyle = {
  outerBg: string
  frameBg: string
  cardBg: string
  ink: string
  muted: string
  accent: string
  border: string
  sprocket: boolean
}

const SLIDE_THEME_STYLES: Record<Theme, SlidePaletteStyle> = {
  'soft-archive': {
    outerBg: '#e8e3d9',
    frameBg: '#f4f0e8',
    cardBg: '#faf7f0',
    ink: '#151311',
    muted: '#6c655c',
    accent: '#c43627',
    border: '#151311',
    sprocket: false,
  },
  'noir-journal': {
    outerBg: '#070706',
    frameBg: '#0f0f0d',
    cardBg: '#161614',
    ink: '#ebe5d9',
    muted: '#8a8376',
    accent: '#e45c33',
    border: 'rgba(235, 229, 217, 0.36)',
    sprocket: true,
  },
  'film-notes': {
    outerBg: '#dde3e9',
    frameBg: '#edf1f5',
    cardBg: '#f7f9fb',
    ink: '#0f2342',
    muted: '#566882',
    accent: '#b8661e',
    border: '#0f2342',
    sprocket: true,
  },
}

export async function exportMemoirHtml(memoir: Memoir, options: ExportVisualOptions = {}) {
  await deliverTextFile(
    buildMemoirFileName(memoir.title, 'html'),
    renderMemoirHtml(memoir, { includeStamp: options.includeStamp }),
    'text/html',
  )
}

export async function exportPortableMemoir(memoir: Memoir) {
  await deliverBinaryFile(buildPortableMemoirFileName(memoir.title), buildPortableMemoirArchive(memoir), PORTABLE_MEMOIR_MIME)
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('instagram-slide-image-load-failed'))
    image.src = dataUrl
  })
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean)
  let line = ''
  let lineCount = 0

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word
    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine
      continue
    }

    if (line) {
      context.fillText(line, x, y + lineCount * lineHeight)
      lineCount += 1
    }

    line = word
    if (lineCount >= maxLines - 1) {
      break
    }
  }

  if (line && lineCount < maxLines) {
    context.fillText(line, x, y + lineCount * lineHeight)
  }
}

function drawCroppedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / Math.max(1, image.naturalHeight)
  const targetRatio = width / height
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  let sourceX = 0
  let sourceY = 0

  if (imageRatio > targetRatio) {
    sourceWidth = sourceHeight * targetRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = sourceWidth / targetRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function drawSprocketHoles(context: CanvasRenderingContext2D, width: number, height: number, fill: string) {
  context.fillStyle = fill
  const holeW = 14
  const holeH = 26
  for (let y = 74; y < height - 74; y += 64) {
    context.fillRect(16, y, holeW, holeH)
    context.fillRect(width - 30, y, holeW, holeH)
  }
}

function drawRebateStamp(context: CanvasRenderingContext2D, width: number, y: number, color: string) {
  context.save()
  context.fillStyle = color
  context.font = '700 16px ui-monospace, Menlo, monospace'
  context.textAlign = 'center'
  context.fillText(EXPORT_STAMP_TEXT, width / 2, y)
  context.restore()
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('instagram-slide-render-failed'))
        return
      }
      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/png')
  })
}

async function renderInstagramSlidePng(slide: MemoirSlide, includeStamp = true): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = slide.width
  canvas.height = slide.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('instagram-slide-canvas-unavailable')
  }

  const style = SLIDE_THEME_STYLES[slide.theme] ?? SLIDE_THEME_STYLES['soft-archive']
  const palette = await extractAssetPalette(slide.asset)

  // Archival paper / darkroom background
  context.fillStyle = style.outerBg
  context.fillRect(0, 0, slide.width, slide.height)
  context.fillStyle = style.frameBg
  context.fillRect(46, 46, slide.width - 92, slide.height - 92)

  if (style.sprocket) {
    drawSprocketHoles(
      context,
      slide.width,
      slide.height,
      slide.theme === 'noir-journal' ? 'rgba(243, 238, 229, 0.14)' : 'rgba(20, 34, 52, 0.12)',
    )
  }

  // Editorial top masthead strip
  context.fillStyle = style.muted
  context.font = '700 22px ui-monospace, Menlo, monospace'
  context.fillText(slide.rawTitle.slice(0, 34).toUpperCase(), 84, 92)
  context.textAlign = 'right'
  context.fillStyle = style.accent
  context.fillText(`${String(slide.index).padStart(2, '0')} / ${String(slide.count).padStart(2, '0')} · ${slide.tone.toUpperCase()}`, slide.width - 84, 92)
  context.textAlign = 'left'

  // Framed 4:5 photo card
  const image = await loadImage(slide.asset.dataUrl)
  drawCroppedImage(context, image, 84, 118, 912, 792)

  // Editorial caption sheet below image
  context.fillStyle = style.cardBg
  context.fillRect(84, 910, 912, 346)
  context.strokeStyle = style.border
  context.lineWidth = 3
  context.strokeRect(84, 118, 912, 1138)

  // Color DNA 5-swatch bar inside the print card
  context.fillStyle = style.muted
  context.font = '700 20px ui-monospace, Menlo, monospace'
  context.fillText('COLOR DNA', 124, 964)
  palette.swatches.forEach((hex, idx) => {
    const sx = 278 + idx * 42
    context.fillStyle = hex
    context.beginPath()
    context.arc(sx, 957, 13, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = style.border
    context.lineWidth = 1.5
    context.stroke()
  })

  // Headline caption in editorial serif
  context.fillStyle = style.ink
  context.font = 'italic 500 50px Georgia, "Times New Roman", serif'
  drawWrappedText(context, slide.rawCaption, 124, 1036, 832, 58, 2)

  // Supporting story body
  context.fillStyle = style.muted
  context.font = '400 29px "Avenir Next", "Segoe UI", Inter, sans-serif'
  drawWrappedText(context, slide.rawBody, 124, 1164, 832, 40, 2)

  if (includeStamp) {
    drawRebateStamp(context, slide.width, slide.height - 16, style.muted)
  }

  return canvasToPngBytes(canvas)
}

export async function exportInstagramSlides(memoir: Memoir, options: ExportVisualOptions = {}) {
  const includeStamp = options.includeStamp !== false
  const renderSlide = (slide: MemoirSlide) => renderInstagramSlidePng(slide, includeStamp)

  if (isNativeMobile()) {
    const files = await renderInstagramFeedSlideFiles(memoir, { renderSlide })
    await deliverBinaryFiles(files)
    return
  }

  const bytes = await exportInstagramFeedSlides(memoir, { renderSlide })
  await deliverBinaryFile(buildMemoirFileName(memoir.title, 'instagram-slides.zip'), bytes, 'application/zip')
}

export async function exportContactSheetPoster(memoir: Memoir, options: ExportVisualOptions = {}) {
  const includeStamp = options.includeStamp !== false
  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('contact-sheet-canvas-unavailable')
  }

  const style = SLIDE_THEME_STYLES[memoir.theme] ?? SLIDE_THEME_STYLES['soft-archive']
  const { day } = await extractDayPalette(memoir.assets)
  const frames = memoir.assets.slice(0, 9)
  const images = await Promise.all(frames.map((asset) => loadImage(asset.dataUrl)))

  // Background + subtle frame
  ctx.fillStyle = style.outerBg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = style.cardBg
  ctx.fillRect(42, 42, width - 84, height - 84)
  ctx.strokeStyle = style.border
  ctx.lineWidth = 3
  ctx.strokeRect(42, 42, width - 84, height - 84)

  if (style.sprocket) {
    drawSprocketHoles(
      ctx,
      width,
      height,
      memoir.theme === 'noir-journal' ? 'rgba(243, 238, 229, 0.16)' : 'rgba(20, 34, 52, 0.12)',
    )
  }

  // Masthead
  const dateText = new Date(memoir.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
  ctx.fillStyle = style.accent
  ctx.font = '700 22px ui-monospace, Menlo, monospace'
  ctx.fillText(`MEMOIR CONTACT SHEET · ${dateText} · ${memoir.tone.toUpperCase()}`, 82, 108)

  ctx.fillStyle = style.ink
  ctx.font = 'italic 500 66px Georgia, "Times New Roman", serif'
  drawWrappedText(ctx, memoir.title, 82, 184, width - 164, 72, 2)

  // Balanced contact sheet grid
  const count = images.length
  const cols = count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const gridTop = 290
  const gridLeft = 82
  const gridW = width - 164
  const gridH = 740
  const gap = 18
  const cellW = (gridW - gap * (cols - 1)) / cols
  const cellH = (gridH - gap * (rows - 1)) / rows

  images.forEach((img, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = gridLeft + col * (cellW + gap)
    const y = gridTop + row * (cellH + gap)

    drawCroppedImage(ctx, img, x, y, cellW, cellH)
    ctx.strokeStyle = style.border
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, cellW, cellH)

    // 35mm frame number corner stamp
    ctx.fillStyle = 'rgba(14, 16, 15, 0.72)'
    ctx.fillRect(x + 10, y + 10, 58, 28)
    ctx.fillStyle = '#f8f5ef'
    ctx.font = '700 16px ui-monospace, Menlo, monospace'
    ctx.fillText(`${String(idx + 1).padStart(2, '0')}A`, x + 22, y + 30)
  })

  // Pull quote & music cue
  ctx.fillStyle = style.ink
  ctx.font = 'italic 400 32px Georgia, serif'
  drawWrappedText(ctx, memoir.quote ? `“${memoir.quote}”` : memoir.summary, 82, 1094, width - 164, 42, 2)

  // Bottom Day Color DNA strip
  const dnaY = 1202
  ctx.fillStyle = style.muted
  ctx.font = '700 18px ui-monospace, Menlo, monospace'
  ctx.fillText('DAY COLOR DNA', 82, dnaY)

  day.swatches.forEach((hex, idx) => {
    const sx = 82 + idx * 144
    ctx.fillStyle = hex
    ctx.fillRect(sx, dnaY + 14, 128, 30)
    ctx.strokeStyle = style.border
    ctx.lineWidth = 1.5
    ctx.strokeRect(sx, dnaY + 14, 128, 30)
    ctx.fillStyle = style.muted
    ctx.font = '600 16px ui-monospace, Menlo, monospace'
    ctx.fillText(hex.toUpperCase(), sx, dnaY + 66)
  })

  if (memoir.musicCue) {
    ctx.textAlign = 'right'
    ctx.fillStyle = style.accent
    ctx.font = '600 20px "Avenir Next", Inter, sans-serif'
    ctx.fillText(`♪ ${memoir.musicCue.slice(0, 28)}`, width - 82, dnaY + 40)
    ctx.textAlign = 'left'
  }

  if (includeStamp) {
    drawRebateStamp(ctx, width, height - 14, style.muted)
  }

  const bytes = await canvasToPngBytes(canvas)
  await deliverBinaryFile(buildMemoirFileName(memoir.title, 'contact-sheet.png'), bytes, 'image/png')
}

export async function exportCinemaReelVideo(
  memoir: Memoir,
  onProgress?: (pct: number) => void,
  options: ExportVisualOptions = {},
) {
  const { renderCinemaReelWebm } = await import('./reel-export.ts')
  const bytes = await renderCinemaReelWebm(memoir, onProgress, options)
  await deliverBinaryFile(buildMemoirFileName(memoir.title, 'cinema-reel.webm'), bytes, 'video/webm')
}

export async function exportMemoirDiagnostics(memoir: Memoir) {
  await deliverTextFile(
    buildDiagnosticsFileName(memoir.title),
    renderMemoirDiagnosticsJson(memoir),
    'application/json;charset=utf-8',
  )
}

export async function importPortableMemoirFile(file: File): Promise<Memoir> {
  const result = parsePortableMemoirArchive(await file.arrayBuffer())
  return result.memoir
}

export async function openMemoirPrintPreview(memoir: Memoir, options: ExportVisualOptions = {}): Promise<boolean> {
  const html = renderMemoirHtml(memoir, { includeStamp: options.includeStamp })
  if (isNativeMobile()) {
    await deliverTextFile(buildMemoirFileName(memoir.title, 'html'), html, 'text/html')
    return true
  }
  const preview = window.open('', '_blank', 'noopener,noreferrer')
  if (!preview) {
    return false
  }

  preview.document.write(html)
  preview.document.close()
  preview.focus()
  preview.print()
  return true
}

export {
  buildMemoirDiagnosticsExport,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
  type MemoirDiagnosticsExportPayload,
}
