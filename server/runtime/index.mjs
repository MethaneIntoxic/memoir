import { createEmbeddedLlamaProvider, resolveEmbeddedRuntimeConfig } from './embedded-llama.mjs'
import { createOllamaProvider, DEFAULT_OLLAMA_MODEL } from './ollama.mjs'

function cleanMode(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .trim()
    .toLowerCase()
}

function getMemoirRuntimeSelection() {
  const requestedRuntime = cleanMode(process.env.MEMOIR_RUNTIME || 'auto') || 'auto'
  const embeddedConfig = resolveEmbeddedRuntimeConfig()
  const ollamaModelId = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL

  if (requestedRuntime === 'embedded-llama') {
    return {
      requestedRuntime,
      runtimeId: 'embedded-llama',
      embeddedConfig,
      ollamaModelId,
    }
  }

  if (requestedRuntime === 'ollama') {
    return {
      requestedRuntime,
      runtimeId: 'ollama',
      embeddedConfig,
      ollamaModelId,
    }
  }

  return {
    requestedRuntime,
    runtimeId: embeddedConfig.bundleAvailable ? 'embedded-llama' : 'ollama',
    embeddedConfig,
    ollamaModelId,
  }
}

function createMemoirRuntime(selection = getMemoirRuntimeSelection()) {
  if (selection.runtimeId === 'embedded-llama') {
    return createEmbeddedLlamaProvider(selection.embeddedConfig)
  }

  return createOllamaProvider({
    modelId: selection.ollamaModelId,
  })
}

export { createMemoirRuntime, getMemoirRuntimeSelection }
