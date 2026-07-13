import assert from 'node:assert/strict'
import test from 'node:test'
import { rewriteWithRuntime, type NativeRuntimeBridge } from './runtime-adapter.ts'

function createBridge(overrides: Partial<NativeRuntimeBridge> = {}): NativeRuntimeBridge {
  return {
    health: async () => ({ available: true }),
    prepare: async () => ({ available: true }),
    stageAsset: async () => ({ staged: true }),
    clearStagedAssets: async () => ({ cleared: true }),
    generateMemoir: async () => ({}),
    rewrite: async () => ({ text: 'polished' }),
    cancelGeneration: async () => ({ cancelled: true }),
    ...overrides,
  }
}

test('native rewrite prepares the model before the first rewrite', async () => {
  const calls: string[] = []
  const bridge = createBridge({
    health: async () => {
      calls.push('health')
      return { available: false, reason: 'native-ai-model-needs-prepare' }
    },
    prepare: async () => {
      calls.push('prepare')
      return { available: true }
    },
    rewrite: async (payload) => {
      calls.push(`rewrite:${payload.tone}:${payload.text}`)
      return { text: 'ready after prepare' }
    },
  })

  const result = await rewriteWithRuntime({
    apiBase: '/api',
    tone: 'diary',
    text: 'Original passage',
    bridge,
  })

  assert.deepEqual(result, { text: 'ready after prepare' })
  assert.deepEqual(calls, ['health', 'prepare', 'rewrite:diary:Original passage'])
})

test('native rewrite fails closed when preparation does not make the runtime available', async () => {
  let rewriteCalled = false
  const bridge = createBridge({
    health: async () => ({ available: false, reason: 'native-ai-model-needs-prepare' }),
    prepare: async () => ({ available: false, reason: 'native-ai-unsupported-memory' }),
    rewrite: async () => {
      rewriteCalled = true
      return { text: 'must not run' }
    },
  })

  await assert.rejects(
    rewriteWithRuntime({ apiBase: '/api', tone: 'editorial', text: 'Original passage', bridge }),
    /native-ai-unsupported-memory/,
  )
  assert.equal(rewriteCalled, false)
})
