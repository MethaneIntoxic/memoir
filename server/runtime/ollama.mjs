const REQUEST_TIMEOUT_MS = Number(process.env.MEMOIR_REQUEST_TIMEOUT_MS || 60000)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e2b-instruct-q4_K_M'
const DEFAULT_CONTEXT_SIZE = Number(process.env.MEMOIR_MODEL_CONTEXT_SIZE || 8192)
import { parseModelJsonResponse } from './json-parser.mjs'

function cleanValue(value, maxLength = 160) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function createOllamaProvider(options = {}) {
  const modelId = cleanValue(String(options.modelId || DEFAULT_OLLAMA_MODEL), 120) || DEFAULT_OLLAMA_MODEL
  const contextSize =
    Number.isFinite(Number(options.contextSize)) && Number(options.contextSize) > 0
      ? Math.floor(Number(options.contextSize))
      : DEFAULT_CONTEXT_SIZE
  let resolvedModelTag = modelId

  function findBestMatchingTag(models) {
    const exact = models.find((entry) => entry === modelId)
    if (exact) {
      return exact
    }

    const prefixMatch = models.find((entry) => entry.startsWith(modelId) || modelId.startsWith(entry))
    if (prefixMatch) {
      return prefixMatch
    }

    const baseMatch = models.find((entry) => entry.split(':')[0] === modelId.split(':')[0])
    return baseMatch || null
  }

  async function getHealth() {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(2500),
      })

      if (!response.ok) {
        throw new Error(`tags:${response.status}`)
      }

      const payload = await response.json()
      const models = Array.isArray(payload.models)
        ? payload.models.map((entry) => String(entry.model ?? entry.name ?? '')).filter(Boolean)
        : []

      const bestTag = findBestMatchingTag(models)
      if (bestTag) {
        resolvedModelTag = bestTag
      }

      return {
        runtime: 'ollama',
        available: true,
        bundled: false,
        model: modelId,
        modelInstalled: Boolean(bestTag),
        models,
      }
    } catch {
      return {
        runtime: 'ollama',
        available: false,
        bundled: false,
        model: modelId,
        modelInstalled: false,
        models: [],
      }
    }
  }

  async function requestModel(messages) {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: resolvedModelTag,
        stream: false,
        format: 'json',
        options: {
          num_ctx: contextSize,
        },
        messages,
      }),
    })

    if (!response.ok) {
      const detail = cleanValue(await response.text(), 160)
      throw new Error(detail || `chat:${response.status}`)
    }

    const payload = await response.json()
    const content = String(payload.message?.content || '').trim()
    return parseModelJsonResponse(content, { provider: 'Ollama' })
  }

  return {
    runtimeId: 'ollama',
    modelId,
    getHealth,
    requestModel,
  }
}

export { DEFAULT_OLLAMA_MODEL, createOllamaProvider }

