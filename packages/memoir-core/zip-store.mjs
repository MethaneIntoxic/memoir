const encoder = new TextEncoder()
const decoder = new TextDecoder()
const crcTable = new Uint32Array(256)

for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toBytes(value) {
  if (value instanceof Uint8Array) {
    return value
  }

  return encoder.encode(String(value))
}

function writeU16(view, offset, value) {
  view.setUint16(offset, value, true)
}

function writeU32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true)
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function createHeader(length) {
  return new Uint8Array(length)
}

function encodeZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path)
    const content = toBytes(entry.content)
    const crc = crc32(content)

    const localHeader = createHeader(30)
    const localView = new DataView(localHeader.buffer)
    writeU32(localView, 0, 0x04034b50)
    writeU16(localView, 4, 20)
    writeU16(localView, 6, 0x0800)
    writeU16(localView, 8, 0)
    writeU16(localView, 10, 0)
    writeU16(localView, 12, 33)
    writeU32(localView, 14, crc)
    writeU32(localView, 18, content.length)
    writeU32(localView, 22, content.length)
    writeU16(localView, 26, nameBytes.length)
    writeU16(localView, 28, 0)

    localParts.push(localHeader, nameBytes, content)

    const centralHeader = createHeader(46)
    const centralView = new DataView(centralHeader.buffer)
    writeU32(centralView, 0, 0x02014b50)
    writeU16(centralView, 4, 20)
    writeU16(centralView, 6, 20)
    writeU16(centralView, 8, 0x0800)
    writeU16(centralView, 10, 0)
    writeU16(centralView, 12, 0)
    writeU16(centralView, 14, 33)
    writeU32(centralView, 16, crc)
    writeU32(centralView, 20, content.length)
    writeU32(centralView, 24, content.length)
    writeU16(centralView, 28, nameBytes.length)
    writeU16(centralView, 30, 0)
    writeU16(centralView, 32, 0)
    writeU16(centralView, 34, 0)
    writeU16(centralView, 36, 0)
    writeU32(centralView, 38, 0)
    writeU32(centralView, 42, offset)
    centralParts.push(centralHeader, nameBytes)

    offset += localHeader.length + nameBytes.length + content.length
  }

  const centralDirectory = concat(centralParts)
  const end = createHeader(22)
  const endView = new DataView(end.buffer)
  writeU32(endView, 0, 0x06054b50)
  writeU16(endView, 4, 0)
  writeU16(endView, 6, 0)
  writeU16(endView, 8, entries.length)
  writeU16(endView, 10, entries.length)
  writeU32(endView, 12, centralDirectory.length)
  writeU32(endView, 16, offset)
  writeU16(endView, 20, 0)

  return concat([...localParts, centralDirectory, end])
}

function decodeZip(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const entries = new Map()
  let offset = 0

  while (offset + 30 <= data.length) {
    const view = new DataView(data.buffer, data.byteOffset + offset)
    const signature = view.getUint32(0, true)
    if (signature === 0x02014b50 || signature === 0x06054b50) {
      break
    }

    if (signature !== 0x04034b50) {
      throw new Error('invalid-portable-memoir-zip')
    }

    const method = view.getUint16(8, true)
    if (method !== 0) {
      throw new Error('unsupported-portable-memoir-compression')
    }

    const expectedCrc = view.getUint32(14, true)
    const compressedSize = view.getUint32(18, true)
    const uncompressedSize = view.getUint32(22, true)
    const fileNameLength = view.getUint16(26, true)
    const extraLength = view.getUint16(28, true)
    const nameStart = offset + 30
    const contentStart = nameStart + fileNameLength + extraLength
    const contentEnd = contentStart + compressedSize

    if (contentEnd > data.length || compressedSize !== uncompressedSize) {
      throw new Error('invalid-portable-memoir-entry')
    }

    const path = decoder.decode(data.slice(nameStart, nameStart + fileNameLength))
    const content = data.slice(contentStart, contentEnd)
    if (crc32(content) !== expectedCrc) {
      throw new Error('portable-memoir-crc-mismatch')
    }

    entries.set(path, content)
    offset = contentEnd
  }

  return entries
}

export { decodeZip, encodeZip }
