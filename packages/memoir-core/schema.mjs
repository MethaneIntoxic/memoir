const tones = ['romantic', 'playful', 'diary', 'editorial']
const themes = ['noir-journal', 'soft-archive', 'film-notes']

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value) {
  return typeof value === 'string' ? value : null
}

function readNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value) {
  return typeof value === 'boolean' ? value : null
}

function notNull(value) {
  return value !== null
}

function parseTone(value) {
  return typeof value === 'string' && tones.includes(value) ? value : null
}

function parseTheme(value) {
  return typeof value === 'string' && themes.includes(value) ? value : null
}

function parseAsset(value) {
  if (!isRecord(value)) {
    return null
  }

  const id = readString(value.id)
  const name = readString(value.name)
  const dataUrl = readString(value.dataUrl)
  const width = readNumber(value.width)
  const height = readNumber(value.height)

  if (!id || !name || !dataUrl || width === null || height === null) {
    return null
  }

  return { id, name, dataUrl, width, height }
}

function parseSection(value) {
  if (!isRecord(value)) {
    return null
  }

  const id = readString(value.id)
  const assetId = readString(value.assetId)
  const caption = readString(value.caption)
  const body = readString(value.body)

  if (!id || !assetId || caption === null || body === null) {
    return null
  }

  return { id, assetId, caption, body }
}

function parseStringList(value) {
  if (!Array.isArray(value)) {
    return null
  }

  const strings = value.filter((entry) => typeof entry === 'string' && entry.length > 0)
  return strings.length ? strings : null
}

function parseDiagnostics(value) {
  if (!isRecord(value)) {
    return {
      backend: 'local-prototype',
      model: 'unknown',
      reason: 'Diagnostics unavailable',
    }
  }

  const backend = readString(value.backend) ?? 'local-prototype'
  const model = readString(value.model) ?? 'unknown'
  const reason = readString(value.reason) ?? 'Diagnostics unavailable'
  const runtime = readString(value.runtime)
  const stage = readString(value.stage)
  const generatedAt = readString(value.generatedAt)
  const available = readBoolean(value.available)
  const modelInstalled = readBoolean(value.modelInstalled)
  const assetCount = readNumber(value.assetCount)
  const inputWarnings = parseStringList(value.inputWarnings)
  const storyQualityWarnings = parseStringList(value.storyQualityWarnings)

  return {
    backend,
    model,
    reason,
    ...(runtime ? { runtime } : {}),
    ...(stage ? { stage } : {}),
    ...(generatedAt ? { generatedAt } : {}),
    ...(available === null ? {} : { available }),
    ...(modelInstalled === null ? {} : { modelInstalled }),
    ...(assetCount === null ? {} : { assetCount }),
    ...(inputWarnings ? { inputWarnings } : {}),
    ...(storyQualityWarnings ? { storyQualityWarnings } : {}),
  }
}

function parseSectionList(value) {
  if (!Array.isArray(value)) {
    return null
  }

  const sections = value.map(parseSection)
  return sections.every(notNull) ? sections : null
}

function parseAssetList(value) {
  if (!Array.isArray(value)) {
    return null
  }

  const assets = value.map(parseAsset)
  return assets.every(notNull) ? assets : null
}

function parseMemoir(value) {
  if (!isRecord(value)) {
    return null
  }

  const id = readString(value.id)
  const createdAt = readString(value.createdAt)
  const updatedAt = readString(value.updatedAt)
  const title = readString(value.title)
  const summary = readString(value.summary)
  const quote = readString(value.quote)
  const tone = parseTone(value.tone)
  const theme = parseTheme(value.theme)
  const notes = readString(value.notes)
  const musicCue = readString(value.musicCue)
  const assets = parseAssetList(value.assets)
  const sections = parseSectionList(value.sections)

  if (
    !id ||
    !createdAt ||
    !updatedAt ||
    title === null ||
    summary === null ||
    quote === null ||
    !tone ||
    !theme ||
    notes === null ||
    musicCue === null ||
    !assets ||
    !sections
  ) {
    return null
  }

  const assetIds = new Set(assets.map((asset) => asset.id))
  const repairedSections = sections
    .map((section, index) =>
      assetIds.has(section.assetId)
        ? section
        : {
            ...section,
            assetId: assets[index]?.id ?? assets[0]?.id ?? section.assetId,
          },
    )
    .filter((section) => assetIds.has(section.assetId))

  if (!assets.length || !repairedSections.length) {
    return null
  }

  return {
    id,
    createdAt,
    updatedAt,
    title,
    summary,
    quote,
    tone,
    theme,
    notes,
    musicCue,
    assets,
    sections: repairedSections,
    diagnostics: parseDiagnostics(value.diagnostics),
  }
}

function parseMemoirList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(parseMemoir).filter(notNull)
}

function parseGenerateMemoirPayload(value) {
  if (!isRecord(value)) {
    return null
  }

  const title = readString(value.title)
  const summary = readString(value.summary)
  const quote = readString(value.quote)
  const sections = parseSectionList(value.sections)

  if (title === null || summary === null || quote === null || !sections) {
    return null
  }

  return {
    title,
    summary,
    quote,
    sections,
    diagnostics: parseDiagnostics(value.diagnostics),
  }
}

function parseRewriteText(value) {
  if (!isRecord(value)) {
    return null
  }

  const text = readString(value.text)
  return text && text.trim() ? text : null
}

function normalizeApiBase(value) {
  const trimmed = String(value || '').trim()
  const normalized = trimmed.replace(/\/+$/, '')
  return normalized || '/api'
}

export {
  isRecord,
  normalizeApiBase,
  parseAsset,
  parseDiagnostics,
  parseGenerateMemoirPayload,
  parseMemoir,
  parseMemoirList,
  parseRewriteText,
  parseSection,
  themes,
  tones,
}
