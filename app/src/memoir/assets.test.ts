import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeImage } from './assets.ts'

test('sanitizeImage uses mobile-friendly size and quality defaults', async () => {
  const originalImage = globalThis.Image
  const originalDocument = globalThis.document
  const originalCreateObjectUrl = URL.createObjectURL
  const originalRevokeObjectUrl = URL.revokeObjectURL
  let encoded: { width: number; height: number; type: string; quality: number } | null = null

  globalThis.Image = class {
    width = 4000
    height = 3000
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    set src(_value: string) {
      this.onload?.()
    }
  } as unknown as typeof Image
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return { drawImage() {} }
        },
        toDataURL(type: string, quality: number) {
          encoded = { width: this.width, height: this.height, type, quality }
          return 'data:image/jpeg;base64,small'
        },
      }
    },
  } as unknown as Document
  URL.createObjectURL = () => 'blob://photo'
  URL.revokeObjectURL = () => {}

  try {
    const asset = await sanitizeImage(new File(['x'], 'photo.png', { type: 'image/png' }))

    assert.equal(asset.width, 960)
    assert.equal(asset.height, 720)
    assert.deepEqual(encoded, { width: 960, height: 720, type: 'image/jpeg', quality: 0.68 })
  } finally {
    globalThis.Image = originalImage
    globalThis.document = originalDocument
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})
