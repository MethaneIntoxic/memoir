import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkServerHealth,
  createDevBrowserController,
  waitForServerHealth,
} from '../scripts/dev-browser.mjs'

test('checkServerHealth returns true only for ok health responses', async () => {
  const requestedUrls = []

  assert.equal(
    await checkServerHealth({
      apiBaseUrl: 'http://127.0.0.1:8787/api',
      fetchImpl: async (url) => {
        requestedUrls.push(String(url))
        return { ok: true }
      },
    }),
    true,
  )
  assert.deepEqual(requestedUrls, ['http://127.0.0.1:8787/api/health'])

  assert.equal(
    await checkServerHealth({
      fetchImpl: async () => ({ ok: false }),
    }),
    false,
  )

  assert.equal(
    await checkServerHealth({
      fetchImpl: async () => {
        throw new Error('offline')
      },
    }),
    false,
  )
})

test('waitForServerHealth polls until health becomes available', async () => {
  let attempts = 0
  const delays = []

  const healthy = await waitForServerHealth({
    timeoutMs: 1000,
    pollIntervalMs: 25,
    now: () => attempts * 25,
    wait: async (delayMs) => {
      delays.push(delayMs)
    },
    checkHealth: async () => {
      attempts += 1
      return attempts === 3
    },
  })

  assert.equal(healthy, true)
  assert.equal(attempts, 3)
  assert.deepEqual(delays, [25, 25])
})

test('waitForServerHealth returns false after timeout', async () => {
  let currentTime = 0

  const healthy = await waitForServerHealth({
    timeoutMs: 50,
    pollIntervalMs: 25,
    now: () => currentTime,
    wait: async (delayMs) => {
      currentTime += delayMs
    },
    checkHealth: async () => false,
  })

  assert.equal(healthy, false)
})

test('dev browser controller reuses an already healthy API server', async () => {
  const spawned = []

  const controller = createDevBrowserController({
    checkHealth: async () => true,
    spawnProcess(command, args) {
      spawned.push([command, ...args])
      return createFakeChildProcess()
    },
  })

  const result = await controller.start()
  await controller.stop()

  assert.equal(result.reusedServer, true)
  assert.equal(result.serverStarted, false)
  assert.deepEqual(spawned, [['npm', '--prefix', 'app', 'run', 'dev']])
})

test('dev browser controller starts and owns the API server when health is unavailable', async () => {
  const spawned = []
  const healthResults = [false, false, true]

  const controller = createDevBrowserController({
    checkHealth: async () => healthResults.shift() ?? true,
    wait: async () => {},
    spawnProcess(command, args) {
      const child = createFakeChildProcess()
      spawned.push({ command, args, child })
      return child
    },
  })

  const result = await controller.start()
  await controller.stop()

  assert.equal(result.reusedServer, false)
  assert.equal(result.serverStarted, true)
  assert.deepEqual(
    spawned.map((entry) => [entry.command, ...entry.args]),
    [
      ['node', 'server/server.mjs'],
      ['npm', '--prefix', 'app', 'run', 'dev'],
    ],
  )
  assert.equal(spawned[0].child.killCount, 1)
  assert.equal(spawned[1].child.killCount, 1)
})

test('dev browser controller fails before Vite when API server cannot become healthy', async () => {
  const spawned = []

  const controller = createDevBrowserController({
    checkHealth: async () => false,
    wait: async () => {},
    spawnProcess(command, args) {
      const child = createFakeChildProcess()
      spawned.push({ command, args, child })
      return child
    },
    serverStartupTimeoutMs: 25,
  })

  await assert.rejects(() => controller.start(), /Memoir API server did not become healthy/)
  await controller.stop()

  assert.deepEqual(
    spawned.map((entry) => [entry.command, ...entry.args]),
    [['node', 'server/server.mjs']],
  )
  assert.equal(spawned[0].child.killCount, 1)
})

function createFakeChildProcess() {
  return {
    killCount: 0,
    killed: false,
    once() {},
    kill() {
      this.killCount += 1
      this.killed = true
    },
  }
}
