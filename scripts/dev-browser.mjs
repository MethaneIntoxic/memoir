import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_API_BASE_URL = process.env.MEMOIR_DEV_API_BASE || 'http://127.0.0.1:8787/api'
const DEFAULT_SERVER_STARTUP_TIMEOUT_MS = Number(process.env.MEMOIR_DEV_SERVER_TIMEOUT_MS || 15000)
const DEFAULT_HEALTH_POLL_INTERVAL_MS = Number(process.env.MEMOIR_DEV_HEALTH_POLL_MS || 250)

function normalizeApiBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  return trimmed || DEFAULT_API_BASE_URL
}

function delay(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

async function checkServerHealth(options = {}) {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl || DEFAULT_API_BASE_URL)
  const fetchImpl = options.fetchImpl || fetch

  try {
    const response = await fetchImpl(`${apiBaseUrl}/health`, {
      signal: AbortSignal.timeout(1000),
    })

    return response.ok === true
  } catch {
    return false
  }
}

async function waitForServerHealth(options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SERVER_STARTUP_TIMEOUT_MS
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_HEALTH_POLL_INTERVAL_MS
  const wait = options.wait || delay
  const now = options.now || Date.now
  const checkHealth = options.checkHealth || (() => checkServerHealth(options))
  const startedAt = now()

  while (now() - startedAt < timeoutMs) {
    if (await checkHealth()) {
      return true
    }

    await wait(pollIntervalMs)
  }

  return false
}

function spawnDevProcess(command, args, options = {}) {
  let resolvedCommand = command
  let resolvedArgs = args

  if (command === 'node') {
    resolvedCommand = process.execPath
  }

  if (process.platform === 'win32' && command === 'npm') {
    resolvedCommand = process.env.ComSpec || 'cmd.exe'
    resolvedArgs = ['/d', '/s', '/c', 'npm', ...args]
  }

  return spawn(resolvedCommand, resolvedArgs, {
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
    stdio: options.stdio || 'inherit',
    windowsHide: false,
  })
}

function killChild(childProcess) {
  if (!childProcess || childProcess.killed) {
    return
  }

  childProcess.kill()
}

function createDevBrowserController(options = {}) {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl || DEFAULT_API_BASE_URL)
  const checkHealth = options.checkHealth || (() => checkServerHealth({ apiBaseUrl }))
  const wait = options.wait || delay
  const spawnProcess = options.spawnProcess || spawnDevProcess
  const serverStartupTimeoutMs = options.serverStartupTimeoutMs ?? DEFAULT_SERVER_STARTUP_TIMEOUT_MS
  const healthPollIntervalMs = options.healthPollIntervalMs ?? DEFAULT_HEALTH_POLL_INTERVAL_MS
  let ownedServerProcess = null
  let viteProcess = null
  let startResult = null

  async function start() {
    const serverAlreadyHealthy = await checkHealth()

    if (!serverAlreadyHealthy) {
      ownedServerProcess = spawnProcess('node', ['server/server.mjs'])
      const serverHealthy = await waitForServerHealth({
        timeoutMs: serverStartupTimeoutMs,
        pollIntervalMs: healthPollIntervalMs,
        wait,
        checkHealth,
      })

      if (!serverHealthy) {
        killChild(ownedServerProcess)
        ownedServerProcess = null
        throw new Error(`Memoir API server did not become healthy at ${apiBaseUrl}/health`)
      }
    }

    viteProcess = spawnProcess('npm', ['--prefix', 'app', 'run', 'dev'])
    startResult = {
      reusedServer: serverAlreadyHealthy,
      serverStarted: !serverAlreadyHealthy,
    }

    return startResult
  }

  async function stop() {
    killChild(viteProcess)
    killChild(ownedServerProcess)
    viteProcess = null
    ownedServerProcess = null
  }

  function waitForViteExit() {
    if (!viteProcess) {
      return Promise.resolve(0)
    }

    return new Promise((resolve, reject) => {
      viteProcess.once('error', reject)
      viteProcess.once('exit', (code, signal) => {
        resolve(code ?? (signal ? 1 : 0))
      })
    })
  }

  return {
    start,
    stop,
    waitForViteExit,
    get startResult() {
      return startResult
    },
  }
}

async function runCli() {
  const controller = createDevBrowserController()
  let stopping = false

  async function stopAndExit(exitCode) {
    if (stopping) {
      return
    }

    stopping = true
    await controller.stop()
    process.exit(exitCode)
  }

  process.once('SIGINT', () => {
    void stopAndExit(130)
  })
  process.once('SIGTERM', () => {
    void stopAndExit(143)
  })

  try {
    const result = await controller.start()
    if (result.reusedServer) {
      console.log(`Memoir API already healthy at ${DEFAULT_API_BASE_URL}/health`)
    } else {
      console.log(`Memoir API started at ${DEFAULT_API_BASE_URL}/health`)
    }

    const exitCode = await controller.waitForViteExit()
    await controller.stop()
    process.exitCode = exitCode
  } catch (error) {
    await controller.stop()
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli()
}

export {
  checkServerHealth,
  createDevBrowserController,
  normalizeApiBaseUrl,
  waitForServerHealth,
}
