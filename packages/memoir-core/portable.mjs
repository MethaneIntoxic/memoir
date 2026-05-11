import { buildMemoirDiagnosticsExport, renderMemoirHtml } from './html.mjs'
import { parseMemoir } from './schema.mjs'
import { decodeZip, encodeZip } from './zip-store.mjs'

const PORTABLE_MEMOIR_FORMAT = 'com.memoir.portable'
const PORTABLE_MEMOIR_VERSION = 1
const PORTABLE_MEMOIR_MIME = 'application/vnd.memoir+zip'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function safePathSegment(value, fallback) {
  return (
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || fallback
  )
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) {
    return null
  }

  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  }
}

function extensionForMime(mimeType) {
  if (mimeType === 'image/png') {
    return 'png'
  }

  if (mimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

function base64ToBytes(base64) {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }

  return new Uint8Array(Buffer.from(base64, 'base64'))
}

function bytesToBase64(bytes) {
  if (typeof btoa === 'function') {
    let binary = ''
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  }

  return Buffer.from(bytes).toString('base64')
}

function encodeJson(value) {
  return encoder.encode(`${JSON.stringify(value, null, 2)}\n`)
}

function decodeJson(bytes) {
  return JSON.parse(decoder.decode(bytes))
}

function stripAssetDataUrls(memoir, assetEntries) {
  const assetEntryMap = new Map(assetEntries.map((entry) => [entry.id, entry]))
  return {
    ...memoir,
    assets: memoir.assets.map((asset) => {
      const assetEntry = assetEntryMap.get(asset.id)
      return {
        id: asset.id,
        name: asset.name,
        width: asset.width,
        height: asset.height,
        dataPath: assetEntry?.path || '',
        mimeType: assetEntry?.mimeType || '',
      }
    }),
  }
}

function buildPortableMemoirArchive(memoir) {
  const parsedMemoir = parseMemoir(memoir)
  if (!parsedMemoir) {
    throw new Error('invalid-portable-memoir-source')
  }

  const generatedAt = new Date().toISOString()
  const assetEntries = parsedMemoir.assets.map((asset, index) => {
    const parsedDataUrl = parseDataUrl(asset.dataUrl)
    if (!parsedDataUrl) {
      throw new Error(`invalid-portable-memoir-asset:${asset.id}`)
    }

    const extension = extensionForMime(parsedDataUrl.mimeType)
    const path = `assets/${String(index + 1).padStart(2, '0')}-${safePathSegment(asset.id, `asset-${index + 1}`)}.${extension}`
    return {
      id: asset.id,
      name: asset.name,
      width: asset.width,
      height: asset.height,
      mimeType: parsedDataUrl.mimeType,
      path,
      bytes: base64ToBytes(parsedDataUrl.base64),
    }
  })

  const manifest = {
    format: PORTABLE_MEMOIR_FORMAT,
    version: PORTABLE_MEMOIR_VERSION,
    generatedAt,
    title: parsedMemoir.title,
    assetCount: assetEntries.length,
    files: {
      memoir: 'memoir.json',
      diagnostics: 'diagnostics.json',
      exportMetadata: 'export.json',
      html: 'exports/memoir.html',
    },
    assets: assetEntries.map(({ bytes: _bytes, ...entry }) => entry),
  }
  const exportMetadata = {
    generatedAt,
    formats: ['memoir', 'html'],
    htmlPath: manifest.files.html,
    portableMime: PORTABLE_MEMOIR_MIME,
  }

  return encodeZip([
    { path: 'manifest.json', content: encodeJson(manifest) },
    { path: manifest.files.memoir, content: encodeJson(stripAssetDataUrls(parsedMemoir, assetEntries)) },
    { path: manifest.files.diagnostics, content: encodeJson(buildMemoirDiagnosticsExport(parsedMemoir)) },
    { path: manifest.files.exportMetadata, content: encodeJson(exportMetadata) },
    { path: manifest.files.html, content: encoder.encode(renderMemoirHtml(parsedMemoir)) },
    ...assetEntries.map((entry) => ({ path: entry.path, content: entry.bytes })),
  ])
}

function parsePortableMemoirArchive(bytes) {
  const entries = decodeZip(bytes)
  const manifestBytes = entries.get('manifest.json')
  if (!manifestBytes) {
    throw new Error('portable-memoir-manifest-missing')
  }

  const manifest = decodeJson(manifestBytes)
  if (
    manifest?.format !== PORTABLE_MEMOIR_FORMAT ||
    manifest.version !== PORTABLE_MEMOIR_VERSION ||
    !manifest.files?.memoir ||
    !Array.isArray(manifest.assets)
  ) {
    throw new Error('portable-memoir-manifest-invalid')
  }

  const memoirBytes = entries.get(manifest.files.memoir)
  if (!memoirBytes) {
    throw new Error('portable-memoir-json-missing')
  }

  const memoirPayload = decodeJson(memoirBytes)
  const assetMetadata = new Map(manifest.assets.map((asset) => [asset.id, asset]))
  const memoir = {
    ...memoirPayload,
    assets: Array.isArray(memoirPayload.assets)
      ? memoirPayload.assets.map((asset) => {
          const metadata = assetMetadata.get(asset.id)
          if (!metadata?.path || !metadata.mimeType) {
            return asset
          }

          const assetBytes = entries.get(metadata.path)
          if (!assetBytes) {
            return asset
          }

          return {
            id: asset.id,
            name: asset.name,
            width: asset.width,
            height: asset.height,
            dataUrl: `data:${metadata.mimeType};base64,${bytesToBase64(assetBytes)}`,
          }
        })
      : [],
  }
  const parsedMemoir = parseMemoir(memoir)
  if (!parsedMemoir) {
    throw new Error('portable-memoir-json-invalid')
  }

  return {
    manifest,
    memoir: parsedMemoir,
    diagnostics: entries.get(manifest.files.diagnostics)
      ? decodeJson(entries.get(manifest.files.diagnostics))
      : null,
    exportMetadata: entries.get(manifest.files.exportMetadata)
      ? decodeJson(entries.get(manifest.files.exportMetadata))
      : null,
  }
}

export {
  PORTABLE_MEMOIR_FORMAT,
  PORTABLE_MEMOIR_MIME,
  PORTABLE_MEMOIR_VERSION,
  buildPortableMemoirArchive,
  parsePortableMemoirArchive,
}
