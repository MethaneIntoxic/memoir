import type { Asset } from './types.ts'

export type PhotoPalette = {
  swatches: string[]
  dominant: string
  accent: string
  glow: string
}

export type DayPalette = {
  swatches: string[]
  ambientA: string
  ambientB: string
}

const DEFAULT_SWATCHES = ['#2f4858', '#a3475a', '#c9966b', '#52796f', '#d8cfc4']
const MAX_CACHE_ENTRIES = 120
const paletteCache = new Map<string, PhotoPalette>()

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) {
    return `rgba(163, 71, 90, ${alpha})`
  }
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(163, 71, 90, ${alpha})`
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function rgbDistanceSq(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11
}

function computeSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

function computeLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function quantizePixelsToPalette(pixels: Uint8ClampedArray | number[]): PhotoPalette {
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>()

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 255
    if (alpha < 128) continue
    const r = pixels[i] ?? 0
    const g = pixels[i + 1] ?? 0
    const b = pixels[i + 2] ?? 0

    // 4-bit per channel quantization (4096 possible bins)
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const existing = buckets.get(key)
    if (existing) {
      existing.r += r
      existing.g += g
      existing.b += b
      existing.count += 1
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
  }

  if (buckets.size === 0) {
    return {
      swatches: [...DEFAULT_SWATCHES],
      dominant: DEFAULT_SWATCHES[0],
      accent: DEFAULT_SWATCHES[1],
      glow: hexToRgba(DEFAULT_SWATCHES[1], 0.22),
    }
  }

  const candidates = Array.from(buckets.values()).map((bucket) => {
    const r = bucket.r / bucket.count
    const g = bucket.g / bucket.count
    const b = bucket.b / bucket.count
    const sat = computeSaturation(r, g, b)
    const lum = computeLuminance(r, g, b)
    // Prefer balanced tones over blown-out whites or crushed blacks
    const lumWeight = lum > 0.1 && lum < 0.9 ? 1.2 : 0.65
    const score = bucket.count * (0.65 + sat * 1.45) * lumWeight
    return { rgb: [r, g, b] as [number, number, number], count: bucket.count, sat, lum, score }
  })

  candidates.sort((a, b) => b.score - a.score)

  const selected: typeof candidates = []
  const minDistSq = 950

  for (const candidate of candidates) {
    if (selected.length >= 5) break
    const isDistinct = selected.every((picked) => rgbDistanceSq(picked.rgb, candidate.rgb) >= minDistSq)
    if (isDistinct) {
      selected.push(candidate)
    }
  }

  // Backfill if monochrome / very low color variance
  for (const candidate of candidates) {
    if (selected.length >= 5) break
    if (!selected.includes(candidate)) {
      selected.push(candidate)
    }
  }

  const swatches = selected.map((entry) => rgbToHex(entry.rgb[0], entry.rgb[1], entry.rgb[2]))
  while (swatches.length < 5) {
    swatches.push(DEFAULT_SWATCHES[swatches.length] ?? '#665d5e')
  }

  const dominantEntry = [...selected].sort((a, b) => b.count - a.count)[0] ?? selected[0]
  const accentEntry = [...selected].sort((a, b) => b.sat * (b.lum > 0.15 && b.lum < 0.85 ? 1.4 : 0.7) - a.sat * (a.lum > 0.15 && a.lum < 0.85 ? 1.4 : 0.7))[0] ?? selected[0]

  const dominant = dominantEntry ? rgbToHex(...dominantEntry.rgb) : swatches[0]
  const accent = accentEntry ? rgbToHex(...accentEntry.rgb) : swatches[1]

  return {
    swatches,
    dominant,
    accent,
    glow: hexToRgba(accent, 0.2),
  }
}

function fallbackPaletteForId(seed: string): PhotoPalette {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const presets: string[][] = [
    ['#263849', '#c87d55', '#e4b38c', '#4d6a6d', '#dfd5c8'],
    ['#36213e', '#a3475a', '#e09f7d', '#557a67', '#ede3dc'],
    ['#1d3557', '#457b9d', '#e6a56e', '#a8c6c3', '#f1ebe1'],
    ['#3d405b', '#c96f53', '#e8b97c', '#6c8b74', '#eae2d6'],
  ]
  const picked = presets[Math.abs(hash) % presets.length] ?? DEFAULT_SWATCHES
  return {
    swatches: [...picked],
    dominant: picked[0],
    accent: picked[1],
    glow: hexToRgba(picked[1], 0.2),
  }
}

function cachePalette(key: string, palette: PhotoPalette) {
  if (paletteCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = paletteCache.keys().next().value
    if (oldestKey) paletteCache.delete(oldestKey)
  }
  paletteCache.set(key, palette)
}

export async function extractAssetPalette(asset: Pick<Asset, 'id' | 'dataUrl'>): Promise<PhotoPalette> {
  const cacheKey = `${asset.id}:${asset.dataUrl.length}`
  const cached = paletteCache.get(cacheKey)
  if (cached) {
    return cached
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined' || !asset.dataUrl.startsWith('data:image/')) {
    const fallback = fallbackPaletteForId(asset.id)
    cachePalette(cacheKey, fallback)
    return fallback
  }

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image()
      next.decoding = 'async'
      next.onload = () => resolve(next)
      next.onerror = () => reject(new Error('palette-image-load-failed'))
      next.src = asset.dataUrl
    })

    const sampleSize = 24
    const canvas = document.createElement('canvas')
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('palette-canvas-unavailable')
    }

    ctx.drawImage(image, 0, 0, sampleSize, sampleSize)
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)
    const palette = quantizePixelsToPalette(data)
    cachePalette(cacheKey, palette)
    return palette
  } catch {
    const fallback = fallbackPaletteForId(asset.id)
    cachePalette(cacheKey, fallback)
    return fallback
  }
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    Number.parseInt(clean.slice(0, 2), 16) || 0,
    Number.parseInt(clean.slice(2, 4), 16) || 0,
    Number.parseInt(clean.slice(4, 6), 16) || 0,
  ]
}

export async function extractDayPalette(assets: Array<Pick<Asset, 'id' | 'dataUrl'>>): Promise<{
  perAsset: Map<string, PhotoPalette>
  day: DayPalette
}> {
  const perAsset = new Map<string, PhotoPalette>()
  if (!assets.length) {
    return {
      perAsset,
      day: {
        swatches: [...DEFAULT_SWATCHES],
        ambientA: DEFAULT_SWATCHES[1],
        ambientB: DEFAULT_SWATCHES[3],
      },
    }
  }

  const results = await Promise.all(assets.map(async (asset) => ({ id: asset.id, palette: await extractAssetPalette(asset) })))
  const pool: string[] = []

  for (const entry of results) {
    perAsset.set(entry.id, entry.palette)
    pool.push(entry.palette.accent, entry.palette.dominant, ...entry.palette.swatches)
  }

  const unique: string[] = []
  for (const hex of pool) {
    if (unique.length >= 5) break
    const rgb = hexToRgbTuple(hex)
    const distinct = unique.every((existing) => rgbDistanceSq(hexToRgbTuple(existing), rgb) >= 900)
    if (distinct) {
      unique.push(hex)
    }
  }

  for (const hex of pool) {
    if (unique.length >= 5) break
    if (!unique.includes(hex)) {
      unique.push(hex)
    }
  }

  while (unique.length < 5) {
    unique.push(DEFAULT_SWATCHES[unique.length] ?? '#52796f')
  }

  return {
    perAsset,
    day: {
      swatches: unique,
      ambientA: unique[0] ?? DEFAULT_SWATCHES[1],
      ambientB: unique[2] ?? unique[1] ?? DEFAULT_SWATCHES[3],
    },
  }
}
