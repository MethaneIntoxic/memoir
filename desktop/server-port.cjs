const net = require('node:net')

function isReusableHealthPayload(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  if (!options.packaged) {
    return true
  }

  return payload.runtime === 'embedded-llama' && payload.available === true && payload.modelInstalled === true
}

async function defaultReadHealth(port) {
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

function defaultIsPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })

    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.setTimeout(1000, () => {
      socket.destroy()
      resolve(true)
    })
  })
}

async function chooseServerPort(options = {}) {
  const preferredPort = Number(options.preferredPort || 8787)
  const maxAttempts = Number(options.maxAttempts || 20)
  const readHealth = options.readHealth || defaultReadHealth
  const isPortOpen = options.isPortOpen || defaultIsPortOpen

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset
    const health = await readHealth(port)

    if (isReusableHealthPayload(health, options)) {
      return { port, reused: true }
    }

    if (!health && !(await isPortOpen(port))) {
      return { port, reused: false }
    }
  }

  throw new Error(`No available Memoir server port found from ${preferredPort}`)
}

module.exports = {
  chooseServerPort,
  isReusableHealthPayload,
}
