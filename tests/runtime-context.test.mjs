import assert from 'node:assert/strict'
import test from 'node:test'
import { buildEmbeddedChatRequestBody } from '../server/runtime/embedded-llama.mjs'
import { createOllamaProvider } from '../server/runtime/ollama.mjs'

test('ollama chat requests include a conservative context window', async () => {
  const originalFetch = globalThis.fetch
  const calls = []

  globalThis.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      body: options.body ? JSON.parse(String(options.body)) : null,
    })

    if (String(url).endsWith('/api/tags')) {
      return {
        ok: true,
        json: async () => ({ models: [{ model: 'gemma4:e2b' }] }),
      }
    }

    return {
      ok: true,
      json: async () => ({ message: { content: '{"ok":true}' } }),
    }
  }

  try {
    const provider = createOllamaProvider({ modelId: 'gemma4:e2b', contextSize: 8192 })
    await provider.getHealth()
    await provider.requestModel([{ role: 'user', content: 'Return JSON.' }])

    const chatCall = calls.find((call) => call.url.endsWith('/api/chat'))
    assert.equal(chatCall.body.options.num_ctx, 8192)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('embedded chat request body carries manifest context size', () => {
  const body = buildEmbeddedChatRequestBody(
    {
      runtimeModelId: 'Qwen3VL-2B-Instruct-Q4_K_M.gguf',
      contextSize: 8192,
    },
    [{ role: 'user', content: 'Return JSON.' }],
  )

  assert.equal(body.model, 'Qwen3VL-2B-Instruct-Q4_K_M.gguf')
  assert.equal(body.n_ctx, 8192)
  assert.deepEqual(body.response_format, { type: 'json_object' })
})
