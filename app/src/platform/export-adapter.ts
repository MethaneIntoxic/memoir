import { Capacitor, registerPlugin } from '@capacitor/core'

type NativeFilesBridge = {
  shareFile(payload: { name: string; mimeType: string; base64Data: string }): Promise<unknown>
}

const MemoirFiles = registerPlugin<NativeFilesBridge>('MemoirFiles')

function isNativeMobile(): boolean {
  const platform = Capacitor.getPlatform()
  return platform === 'android' || platform === 'ios'
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function deliverTextFile(name: string, content: string, mimeType: string): Promise<void> {
  await deliverBinaryFile(name, new TextEncoder().encode(content), mimeType)
}

export async function deliverBinaryFile(name: string, content: Uint8Array, mimeType: string): Promise<void> {
  if (isNativeMobile()) {
    if (!Capacitor.isPluginAvailable('MemoirFiles')) {
      throw new Error('native-export-plugin-unavailable')
    }
    await MemoirFiles.shareFile({ name, mimeType, base64Data: bytesToBase64(content) })
    return
  }

  const arrayBuffer = new ArrayBuffer(content.byteLength)
  new Uint8Array(arrayBuffer).set(content)
  downloadBlob(name, new Blob([arrayBuffer], { type: mimeType }))
}

export { isNativeMobile }
