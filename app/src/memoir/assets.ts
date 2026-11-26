import type { Asset } from './types.ts'

export const MAX_CLIENT_ASSETS = 10
export const MAX_VISION_ASSETS = 5
export const MAX_CLIENT_PAYLOAD_BYTES = 15 * 1024 * 1024
export const MOBILE_IMAGE_LONGEST_SIDE = 960
export const MOBILE_IMAGE_JPEG_QUALITY = 0.68

type DecodedSource = {
  source: CanvasImageSource
  width: number
  height: number
  cleanup: () => void
}

async function decodeImageFile(file: File): Promise<DecodedSource> {
  // Fast hardware-accelerated off-thread decode in modern browsers (skipped under unit-test Image mocks)
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      }
    } catch {
      // Fall through to HTMLImageElement path for formats/platforms without createImageBitmap support
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image()
      next.onload = () => resolve(next)
      next.onerror = () => reject(new Error(`Failed to load ${file.name}`))
      next.src = objectUrl
    })

    return {
      source: image,
      width: image.width,
      height: image.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

export async function sanitizeImage(file: File): Promise<Asset> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not a supported image file`)
  }

  const decoded = await decodeImageFile(file)

  try {
    const longestSide = Math.max(decoded.width, decoded.height)
    const scale = longestSide > MOBILE_IMAGE_LONGEST_SIDE ? MOBILE_IMAGE_LONGEST_SIDE / longestSide : 1
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas not available')
    }

    context.drawImage(decoded.source, 0, 0, width, height)

    return {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, '') || 'photo',
      dataUrl: canvas.toDataURL('image/jpeg', MOBILE_IMAGE_JPEG_QUALITY),
      width,
      height,
    }
  } finally {
    decoded.cleanup()
  }
}

export async function sanitizeImagesBatch(files: File[], concurrency = 3): Promise<Asset[]> {
  const results = new Array<Asset>(files.length)
  let cursor = 0

  async function worker() {
    while (cursor < files.length) {
      const index = cursor
      cursor += 1
      const file = files[index]
      if (file) {
        results[index] = await sanitizeImage(file)
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), files.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
