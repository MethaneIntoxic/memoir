import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { chooseServerPort, isReusableHealthPayload } = require('../desktop/server-port.cjs')

test('packaged desktop only reuses an embedded runtime that is ready', () => {
  assert.equal(
    isReusableHealthPayload(
      {
        runtime: 'embedded-llama',
        available: true,
        modelInstalled: true,
      },
      { packaged: true },
    ),
    true,
  )

  assert.equal(
    isReusableHealthPayload(
      {
        runtime: 'ollama',
        available: true,
        modelInstalled: true,
      },
      { packaged: true },
    ),
    false,
  )

  assert.equal(
    isReusableHealthPayload(
      {
        runtime: 'embedded-llama',
        available: false,
        modelInstalled: true,
      },
      { packaged: true },
    ),
    false,
  )
})

test('development desktop may reuse any healthy Memoir server', () => {
  assert.equal(
    isReusableHealthPayload(
      {
        runtime: 'ollama',
        available: false,
        modelInstalled: false,
      },
      { packaged: false },
    ),
    true,
  )
})

test('chooseServerPort skips stale packaged servers and chooses the next free port', async () => {
  const probes = []
  const result = await chooseServerPort({
    preferredPort: 8787,
    maxAttempts: 3,
    packaged: true,
    readHealth: async (port) => {
      probes.push(`health:${port}`)
      if (port === 8787) {
        return {
          runtime: 'embedded-llama',
          available: false,
          modelInstalled: true,
        }
      }

      return null
    },
    isPortOpen: async (port) => {
      probes.push(`open:${port}`)
      return port === 8787
    },
  })

  assert.deepEqual(result, { port: 8788, reused: false })
  assert.deepEqual(probes, ['health:8787', 'health:8788', 'open:8788'])
})

test('chooseServerPort reuses a ready packaged embedded server', async () => {
  const result = await chooseServerPort({
    preferredPort: 8787,
    packaged: true,
    readHealth: async () => ({
      runtime: 'embedded-llama',
      available: true,
      modelInstalled: true,
    }),
  })

  assert.deepEqual(result, { port: 8787, reused: true })
})
