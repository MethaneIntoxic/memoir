const DEFAULT_MAX_RESPONSE_CHARS = Number(process.env.MEMOIR_MODEL_RESPONSE_MAX_CHARS || 262144)
const DEFAULT_MAX_CANDIDATES = 8

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseRecord(candidate) {
  try {
    const parsed = JSON.parse(candidate)
    return isPlainRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function collectJsonObjectCandidates(source, maxCandidates = DEFAULT_MAX_CANDIDATES) {
  const candidates = []
  let startIndex = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (startIndex === -1) {
      if (char === '{') {
        startIndex = index
        depth = 1
        inString = false
        escaped = false
      }
      continue
    }

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1

      if (depth === 0) {
        candidates.push(source.slice(startIndex, index + 1))
        if (candidates.length >= maxCandidates) {
          return candidates
        }

        startIndex = -1
      }
    }
  }

  return candidates
}

function parseModelJsonResponse(content, options = {}) {
  const provider = typeof options.provider === 'string' && options.provider.trim() ? options.provider.trim() : 'Model'
  const maxChars = Number.isFinite(options.maxChars) && options.maxChars > 0 ? options.maxChars : DEFAULT_MAX_RESPONSE_CHARS
  const maxCandidates = Number.isFinite(options.maxCandidates) && options.maxCandidates > 0
    ? Math.floor(options.maxCandidates)
    : DEFAULT_MAX_CANDIDATES

  if (typeof content !== 'string') {
    throw new Error(`${provider} returned a non-text response.`)
  }

  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error(`${provider} returned an empty response.`)
  }

  if (trimmed.length > maxChars) {
    throw new Error(`${provider} returned too much data to parse safely.`)
  }

  const direct = parseRecord(trimmed)
  if (direct) {
    return direct
  }

  const candidates = collectJsonObjectCandidates(trimmed, maxCandidates)
  for (const candidate of candidates) {
    const parsed = parseRecord(candidate)
    if (parsed) {
      return parsed
    }
  }

  throw new Error(`${provider} returned invalid JSON.`)
}

export { collectJsonObjectCandidates, parseModelJsonResponse }