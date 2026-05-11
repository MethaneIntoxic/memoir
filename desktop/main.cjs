const path = require('node:path')
const { spawn } = require('node:child_process')
const { app, BrowserWindow } = require('electron')
const { chooseServerPort, isReusableHealthPayload } = require('./server-port.cjs')

const DEFAULT_SERVER_PORT = Number(process.env.MEMOIR_PORT || 8787)
const SERVER_HEALTH_TIMEOUT_MS = Number(process.env.MEMOIR_DESKTOP_SERVER_TIMEOUT_MS || 45000)
const SERVER_HEALTH_INTERVAL_MS = 250

let serverProcess = null

const appDataRoot = app.getPath('appData')
app.setPath('userData', path.join(appDataRoot, 'Memoir'))
app.setPath('sessionData', path.join(appDataRoot, 'Memoir', 'session'))

function isRendererDevMode() {
  return Boolean(process.env.MEMOIR_DESKTOP_RENDERER_URL)
}

function getProjectRoot() {
  return path.resolve(__dirname, '..')
}

function getRendererUrl() {
  return process.env.MEMOIR_DESKTOP_RENDERER_URL || ''
}

function getRendererEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'dist', 'index.html')
  }

  return path.join(getProjectRoot(), 'app', 'dist', 'index.html')
}

function getServerEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server', 'server.mjs')
  }

  return path.join(getProjectRoot(), 'server', 'server.mjs')
}

function getRuntimeResourcesDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'memoir-runtime')
  }

  return path.join(__dirname, 'resources')
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function readServerHealth(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1000),
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

async function waitForLocalServer(port) {
  const startedAt = Date.now()
  const url = `http://127.0.0.1:${port}/api/health`

  while (Date.now() - startedAt < SERVER_HEALTH_TIMEOUT_MS) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
      })

      if (response.ok && isReusableHealthPayload(await response.json(), { packaged: app.isPackaged })) {
        return
      }
    } catch {
      // Ignore health polling failures until timeout.
    }

    await delay(SERVER_HEALTH_INTERVAL_MS)
  }

  throw new Error('memoir-desktop-server-timeout')
}

async function startLocalServer() {
  if (serverProcess && !serverProcess.killed) {
    return DEFAULT_SERVER_PORT
  }

  const selectedServer = await chooseServerPort({
    preferredPort: DEFAULT_SERVER_PORT,
    packaged: app.isPackaged,
    readHealth: readServerHealth,
  })

  if (selectedServer.reused) {
    return selectedServer.port
  }

  const runtimeMode = process.env.MEMOIR_RUNTIME || 'embedded-llama'
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    MEMOIR_PORT: String(selectedServer.port),
    MEMOIR_RUNTIME: runtimeMode,
    MEMOIR_EMBEDDED_RESOURCES_DIR: getRuntimeResourcesDir(),
  }

  serverProcess = spawn(process.execPath, [getServerEntryPath()], {
    env,
    stdio: 'inherit',
    windowsHide: true,
  })

  serverProcess.once('exit', () => {
    serverProcess = null
  })

  await waitForLocalServer(selectedServer.port)
  return selectedServer.port
}

async function createMainWindow() {
  const port = await startLocalServer()
  process.env.MEMOIR_DESKTOP_API_BASE = `http://127.0.0.1:${port}/api`
  process.env.MEMOIR_DESKTOP_PACKAGED = app.isPackaged ? '1' : '0'

  const window = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#f4efe7',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isRendererDevMode()) {
    await window.loadURL(getRendererUrl())
    return
  }

  await window.loadFile(getRendererEntryPath())
}

function stopLocalServer() {
  if (!serverProcess || serverProcess.killed) {
    return
  }

  serverProcess.kill()
  serverProcess = null
}

app.whenReady().then(async () => {
  await createMainWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopLocalServer()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopLocalServer()
})
