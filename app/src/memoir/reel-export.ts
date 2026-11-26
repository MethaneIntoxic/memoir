import { buildMemoirSlides } from '../../../packages/memoir-core/index.mjs'
import { extractDayPalette } from './palette.ts'
import type { Memoir, Theme } from './types.ts'

export type CinemaReelOptions = {
  includeStamp?: boolean
}

const REEL_STAMP_TEXT = 'MEMOIR 400 · memoir.memoir-press.workers.dev'

type ThemeVisual = {
  bg: string
  ink: string
  muted: string
  accent: string
  scrimTop: string
  scrimBottom: string
}

const REEL_THEMES: Record<Theme, ThemeVisual> = {
  'soft-archive': {
    bg: '#151311',
    ink: '#faf7f0',
    muted: 'rgba(250, 247, 240, 0.8)',
    accent: '#c43627',
    scrimTop: 'rgba(20, 14, 15, 0.42)',
    scrimBottom: 'rgba(18, 12, 13, 0.86)',
  },
  'noir-journal': {
    bg: '#0c0c0a',
    ink: '#ebe5d9',
    muted: 'rgba(235, 229, 217, 0.78)',
    accent: '#e45c33',
    scrimTop: 'rgba(8, 8, 7, 0.45)',
    scrimBottom: 'rgba(8, 8, 7, 0.88)',
  },
  'film-notes': {
    bg: '#0f1722',
    ink: '#f3f7fc',
    muted: 'rgba(243, 247, 252, 0.8)',
    accent: '#b8661e',
    scrimTop: 'rgba(12, 20, 32, 0.44)',
    scrimBottom: 'rgba(10, 16, 26, 0.88)',
  },
}

export function isCinemaReelSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }
  const canvas = document.createElement('canvas')
  return typeof MediaRecorder === 'function' && typeof canvas.captureStream === 'function'
}

function pickSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return ''
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('cinema-reel-image-load-failed'))
    img.src = dataUrl
  })
}

function drawCoverZoom(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const imgRatio = image.naturalWidth / Math.max(1, image.naturalHeight)
  const targetRatio = width / height
  let drawW: number
  let drawH: number

  if (imgRatio > targetRatio) {
    drawH = height * zoom
    drawW = drawH * imgRatio
  } else {
    drawW = width * zoom
    drawH = drawW / imgRatio
  }

  const offsetX = (width - drawW) / 2 + panX
  const offsetY = (height - drawH) / 2 + panY
  ctx.drawImage(image, offsetX, offsetY, drawW, drawH)
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
      if (lines.length >= maxLines - 1) {
        break
      }
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current)
  }
  return lines
}

export async function renderCinemaReelWebm(
  memoir: Memoir,
  onProgress?: (pct: number) => void,
  options: CinemaReelOptions = {},
): Promise<Uint8Array> {
  if (!isCinemaReelSupported()) {
    throw new Error('cinema-reel-unsupported')
  }

  const includeStamp = options.includeStamp !== false
  const slides = buildMemoirSlides(memoir)
  const visual = REEL_THEMES[memoir.theme] ?? REEL_THEMES['soft-archive']
  const { day } = await extractDayPalette(memoir.assets)
  const images = await Promise.all(slides.map((slide) => loadImage(slide.asset.dataUrl)))

  const width = 720
  const height = 900
  const fps = 24
  const msPerFrame = 1000 / fps
  const framesPerSlide = Math.round(fps * 2.5)
  const outroFrames = Math.round(fps * 2.0)
  const totalFrames = slides.length * framesPerSlide + outroFrames

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('cinema-reel-canvas-unavailable')
  }

  const stream = canvas.captureStream(fps)
  const mimeType = pickSupportedMimeType()
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 3_600_000,
  })

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const stopped = new Promise<Uint8Array>((resolve, reject) => {
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
        resolve(new Uint8Array(await blob.arrayBuffer()))
      } catch (error) {
        reject(error)
      }
    }
    recorder.onerror = () => reject(new Error('cinema-reel-record-failed'))
  })

  recorder.start()

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      ctx.fillStyle = visual.bg
      ctx.fillRect(0, 0, width, height)

      const slideSlot = Math.floor(frame / framesPerSlide)
      if (slideSlot < slides.length) {
        const slide = slides[slideSlot]
        const image = images[slideSlot]
        const localT = (frame % framesPerSlide) / Math.max(1, framesPerSlide - 1)
        const dir = slideSlot % 2 === 0 ? 1 : -1

        // Smooth Ken Burns zoom + pan
        ctx.save()
        const fadeIn = Math.min(1, localT * 5)
        ctx.globalAlpha = fadeIn
        drawCoverZoom(ctx, image, width, height, 1.02 + localT * 0.08, dir * localT * 14, -localT * 10)
        ctx.restore()

        // Cinematic gradient scrim
        const scrim = ctx.createLinearGradient(0, 0, 0, height)
        scrim.addColorStop(0, visual.scrimTop)
        scrim.addColorStop(0.32, 'rgba(0,0,0,0)')
        scrim.addColorStop(0.58, 'rgba(0,0,0,0.12)')
        scrim.addColorStop(1, visual.scrimBottom)
        ctx.fillStyle = scrim
        ctx.fillRect(0, 0, width, height)

        // Top progress bars
        const barGap = 8
        const barMargin = 36
        const barWidth = (width - barMargin * 2 - barGap * (slides.length - 1)) / slides.length
        for (let idx = 0; idx < slides.length; idx += 1) {
          const x = barMargin + idx * (barWidth + barGap)
          ctx.fillStyle = 'rgba(255,255,255,0.25)'
          ctx.fillRect(x, 30, barWidth, 4)
          const fill = idx < slideSlot ? 1 : idx === slideSlot ? localT : 0
          ctx.fillStyle = visual.ink
          ctx.fillRect(x, 30, barWidth * fill, 4)
        }

        // Top metadata HUD
        ctx.fillStyle = visual.muted
        ctx.font = '700 18px ui-monospace, Menlo, monospace'
        ctx.fillText(
          `${memoir.title.slice(0, 28).toUpperCase()} · ${String(slide.index).padStart(2, '0')}/${String(slide.count).padStart(2, '0')}`,
          36,
          68,
        )

        // Kinetic subtitle rise
        const textAlpha = Math.min(1, Math.max(0, (localT - 0.08) * 3.5))
        const riseOffset = (1 - textAlpha) * 18
        ctx.save()
        ctx.globalAlpha = textAlpha
        ctx.fillStyle = visual.ink
        ctx.font = 'italic 500 40px Georgia, serif'
        const captionLines = wrapTextLines(ctx, slide.rawCaption, width - 84, 2)
        const baseCaptionY = height - 188 + riseOffset
        captionLines.forEach((line, lineIdx) => {
          ctx.fillText(line, 42, baseCaptionY + lineIdx * 48)
        })

        ctx.fillStyle = visual.muted
        ctx.font = '400 22px "Segoe UI", Inter, sans-serif'
        const bodyLines = wrapTextLines(ctx, slide.rawBody, width - 84, 2)
        const baseBodyY = baseCaptionY + captionLines.length * 48 + 14
        bodyLines.forEach((line, lineIdx) => {
          ctx.fillText(line, 42, baseBodyY + lineIdx * 30)
        })
        ctx.restore()
      } else {
        // Editorial Closing Card with Day Color DNA
        const outroT = (frame - slides.length * framesPerSlide) / Math.max(1, outroFrames - 1)
        ctx.save()
        ctx.globalAlpha = Math.min(1, outroT * 3)

        ctx.fillStyle = visual.accent
        ctx.font = '700 18px ui-monospace, Menlo, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('MEMOIR · 35MM FILM ROLL', width / 2, height * 0.32)

        ctx.fillStyle = visual.ink
        ctx.font = 'italic 500 52px Georgia, serif'
        const titleLines = wrapTextLines(ctx, memoir.title, width - 110, 2)
        titleLines.forEach((line, idx) => {
          ctx.fillText(line, width / 2, height * 0.42 + idx * 60)
        })

        if (memoir.quote) {
          ctx.fillStyle = visual.muted
          ctx.font = 'italic 400 24px Georgia, serif'
          const quoteLines = wrapTextLines(ctx, `“${memoir.quote}”`, width - 130, 3)
          quoteLines.forEach((line, idx) => {
            ctx.fillText(line, width / 2, height * 0.58 + idx * 34)
          })
        }

        // Day Color DNA Swatches
        const dotGap = 44
        const startX = width / 2 - ((day.swatches.length - 1) * dotGap) / 2
        day.swatches.forEach((hex, idx) => {
          ctx.fillStyle = hex
          ctx.fillRect(startX + idx * dotGap - 14, height * 0.75, 28, 22)
        })

        if (includeStamp) {
          ctx.fillStyle = visual.muted
          ctx.font = '700 14px ui-monospace, Menlo, monospace'
          ctx.fillText(REEL_STAMP_TEXT, width / 2, height * 0.87)
        }

        ctx.textAlign = 'left'
        ctx.restore()
      }

      if (frame % 4 === 0 || frame === totalFrames - 1) {
        onProgress?.(Math.min(99, Math.round(((frame + 1) / totalFrames) * 100)))
      }

      await new Promise<void>((resolve) => window.setTimeout(resolve, msPerFrame))
    }

    recorder.stop()
    const bytes = await stopped
    onProgress?.(100)
    return bytes
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}
