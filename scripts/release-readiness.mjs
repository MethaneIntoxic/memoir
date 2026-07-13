import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { nativeBridgeContracts, releaseArtifacts } from '../packages/memoir-core/index.mjs'

const rootDir = process.cwd()

function exists(relativePath) {
  return existsSync(path.join(rootDir, relativePath))
}

function fileSize(relativePath) {
  const absolutePath = path.join(rootDir, relativePath)
  return existsSync(absolutePath) ? statSync(absolutePath).size : 0
}

function listTopLevelExeFiles(relativeDirectory) {
  const absoluteDirectory = path.join(rootDir, relativeDirectory)
  if (!existsSync(absoluteDirectory) || !statSync(absoluteDirectory).isDirectory()) {
    return []
  }

  return readdirSync(absoluteDirectory)
    .map((name) => path.join(absoluteDirectory, name))
    .filter((candidate) => candidate.toLowerCase().endsWith('.exe') && statSync(candidate).isFile())
    .map((candidate) => path.relative(rootDir, candidate).replaceAll(path.sep, '/'))
}

function passingEvidence(relativePath) {
  const absolutePath = path.join(rootDir, relativePath)
  if (!existsSync(absolutePath)) return false
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8')).ok === true
  } catch {
    return false
  }
}

const checks = [
  ['core-package', exists('packages/memoir-core/index.mjs')],
  ['portable-core', exists('packages/memoir-core/portable.mjs')],
  ['mobile-capacitor-config', exists('mobile/capacitor.config.json')],
  ['mobile-package', exists('mobile/package.json')],
  ['mobile-runtime-manifest', exists('mobile/runtime-manifest.json')],
  ['native-bridge-contracts', exists('native/BRIDGE_CONTRACTS.md')],
  ['native-runtime-strategy', exists('native/MOBILE_RUNTIME.md')],
  ['cross-platform-doc', exists('docs/11-cross-platform-release-architecture.md')],
  ['store-checklist', exists('docs/12-store-release-checklist.md')],
  ['single-file-windows-doc', exists('docs/13-single-file-windows-portable-exe.md')],
]

const windowsSingleFileArtifacts = listTopLevelExeFiles('desktop/dist')
const windowsZipPath = 'desktop/dist/Memoir-0.1.0-win.zip'

const artifactStatus = {
  windows: {
    expected: releaseArtifacts.windows,
    unpackedPresent: exists('desktop/dist/win-unpacked/Memoir.exe'),
    unpackedBytes: fileSize('desktop/dist/win-unpacked/Memoir.exe'),
    zipPresent: exists(windowsZipPath),
    zipBytes: fileSize(windowsZipPath),
    singleFilePresent: windowsSingleFileArtifacts.length > 0,
    singleFileArtifacts: windowsSingleFileArtifacts,
    note: windowsSingleFileArtifacts.length
      ? 'Top-level single-file Windows executable exists.'
      : 'Run npm run dist:desktop:single-file to build the primary Windows portable EXE.',
  },
  android: {
    expected: releaseArtifacts.android,
    sourcePresent: exists('mobile/android'),
    present: exists('mobile/android/app/build/outputs/apk/release/app-release.apk'),
    bytes: fileSize('mobile/android/app/build/outputs/apk/release/app-release.apk'),
    note: 'Run npm --prefix mobile run build:android:apk with Android SDK/JDK and signing credentials for the direct APK.',
  },
  ios: {
    expected: releaseArtifacts.ios,
    sourcePresent: exists('mobile/ios'),
    present: exists('output/Memoir.xcarchive/Products/Applications/App.app'),
    note: 'A public release requires macOS, Xcode 26+, archive signing, App Store validation, and TestFlight device acceptance.',
  },
}

const missing = checks.filter(([, ok]) => !ok).map(([name]) => name)
const sourceReady = missing.length === 0
const physicalEvidence = {
  android: passingEvidence('output/android-device-acceptance/result.json'),
  ios: passingEvidence('output/ios-device-acceptance/result.json'),
}
const releaseReady = sourceReady
  && artifactStatus.windows.singleFilePresent
  && artifactStatus.android.present
  && artifactStatus.ios.present
  && physicalEvidence.android
  && physicalEvidence.ios
const result = {
  sourceReady,
  releaseReady,
  missing,
  physicalEvidence,
  bridgeContracts: nativeBridgeContracts,
  artifactStatus,
}

console.log(JSON.stringify(result, null, 2))

if (!sourceReady) {
  process.exitCode = 1
}
