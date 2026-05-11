import type { Asset } from './types.ts'

export const MAX_CLIENT_ASSETS = 10
export const MAX_VISION_ASSETS = 5
export const MAX_CLIENT_PAYLOAD_BYTES = 15 * 1024 * 1024
export const MOBILE_IMAGE_LONGEST_SIDE = 960
export const MOBILE_IMAGE_JPEG_QUALITY = 0.68

export async function sanitizeImage(file: File): Promise<Asset> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not a supported image file`)
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image()
      next.onload = () => resolve(next)
      next.onerror = () => reject(new Error(`Failed to load ${file.name}`))
      next.src = objectUrl
    })

    const longestSide = Math.max(image.width, image.height)
    const scale = longestSide > MOBILE_IMAGE_LONGEST_SIDE ? MOBILE_IMAGE_LONGEST_SIDE / longestSide : 1
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas not available')
    }

    context.drawImage(image, 0, 0, width, height)

    return {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, '') || 'photo',
      dataUrl: canvas.toDataURL('image/jpeg', MOBILE_IMAGE_JPEG_QUALITY),
      width,
      height,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
