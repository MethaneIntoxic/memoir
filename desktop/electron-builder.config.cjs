const fs = require('node:fs')
const { execFile } = require('node:child_process')
const path = require('node:path')
const { promisify } = require('node:util')

const manifestPath = path.join(__dirname, 'resources', 'memoir-default-model.json')
const execFileAsync = promisify(execFile)

function readModelManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('desktop model manifest must be a JSON object')
  }

  return manifest
}

function normalizeRuntimePath(manifest, key) {
  const value = typeof manifest[key] === 'string' ? manifest[key].trim() : ''
  if (!value) {
    throw new Error(`desktop model manifest is missing ${key}`)
  }

  const normalized = path.normalize(value)
  const absolute = path.resolve(__dirname, 'resources', normalized)
  const resourcesRoot = path.resolve(__dirname, 'resources')
  const relative = path.relative(resourcesRoot, absolute)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`desktop model manifest ${key} escapes resources`)
  }

  return relative.split(path.sep).join('/')
}

const manifest = readModelManifest()
const modelPath = normalizeRuntimePath(manifest, 'relativeModelPath')
const mmprojPath = normalizeRuntimePath(manifest, 'relativeMmprojPath')
const readyMarkerPath = normalizeRuntimePath(manifest, 'relativeReadyMarker')

async function patchWindowsAppIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const productFilename = context.packager?.appInfo?.productFilename || 'Memoir'
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`)
  const iconPath = path.join(__dirname, 'resources', 'icon.ico')
  const rceditPath = path.join(
    __dirname,
    'node_modules',
    'electron-winstaller',
    'vendor',
    'rcedit.exe'
  )

  for (const requiredPath of [exePath, iconPath, rceditPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`required icon patch file is missing: ${requiredPath}`)
    }
  }

  await execFileAsync(rceditPath, [exePath, '--set-icon', iconPath], {
    windowsHide: true,
  })

  console.log(`[memoir] patched Windows app icon: ${exePath}`)
}

module.exports = {
  appId: 'local.memoir.desktop',
  productName: 'Memoir',
  files: ['main.cjs', 'preload.cjs', 'server-port.cjs'],
  afterPack: patchWindowsAppIcon,
  extraResources: [
    {
      from: '../app/dist',
      to: 'app/dist',
    },
    {
      from: '../server',
      to: 'server',
    },
    {
      from: 'resources/memoir-default-model.json',
      to: 'memoir-runtime/memoir-default-model.json',
    },
    {
      from: 'resources/llama',
      to: 'memoir-runtime/llama',
      filter: [
        'ggml*.dll',
        'libomp140.x86_64.dll',
        'llama-common.dll',
        'llama.dll',
        'llama-server.exe',
        'mtmd.dll',
      ],
    },
    {
      from: `resources/${modelPath}`,
      to: `memoir-runtime/${modelPath}`,
    },
    {
      from: `resources/${mmprojPath}`,
      to: `memoir-runtime/${mmprojPath}`,
    },
    {
      from: `resources/${readyMarkerPath}`,
      to: `memoir-runtime/${readyMarkerPath}`,
    },
  ],
  directories: {
    buildResources: 'resources',
  },
  win: {
    icon: 'icon.ico',
    target: ['dir', 'zip'],
    signAndEditExecutable: false,
    requestedExecutionLevel: 'asInvoker',
  },
  portable: {
    artifactName: '${productName}-${version}-portable.${ext}',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
}
