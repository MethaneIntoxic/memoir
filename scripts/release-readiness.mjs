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

function fileModifiedMs(relativePath) {
  const absolutePath = path.join(rootDir, relativePath)
  return existsSync(absolutePath) ? statSync(absolutePath).mtimeMs : 0
}

function isArtifactFresh(artifactPath, sourcePaths) {
  const artifactModifiedMs = fileModifiedMs(artifactPath)
  return artifactModifiedMs > 0 && sourcePaths.every((sourcePath) => fileModifiedMs(sourcePath) <= artifactModifiedMs)
}

function passingEvidence(relativePath) {
  const absolutePath = path.join(rootDir, relativePath)
  if (!existsSync(absolutePath)) return false
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '')).ok === true
  } catch {
    return false
  }
}

function passingEvidenceInRunDirectory(relativeDirectory) {
  const absoluteDirectory = path.join(rootDir, relativeDirectory)
  if (!existsSync(absoluteDirectory) || !statSync(absoluteDirectory).isDirectory()) return false

  const candidates = [path.join(absoluteDirectory, 'result.json')]
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) candidates.push(path.join(absoluteDirectory, entry.name, 'result.json'))
  }

  return candidates.some((candidate) => {
    if (!existsSync(candidate)) return false
    try {
      return JSON.parse(readFileSync(candidate, 'utf8').replace(/^\uFEFF/, '')).ok === true
    } catch {
      return false
    }
  })
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
const androidReleasePath = 'mobile/android/app/build/outputs/apk/release/app-release.apk'
const androidDebugPath = 'mobile/android/app/build/outputs/apk/debug/app-debug.apk'
const androidReleaseSources = [
  'app/dist/index.html',
  'mobile/runtime-manifest.json',
  'mobile/capacitor.config.json',
  'mobile/android/app/build.gradle',
  'mobile/android/app/src/main/AndroidManifest.xml',
  'mobile/android/app/src/main/res/xml/data_extraction_rules.xml',
  'mobile/android/app/src/main/cpp/CMakeLists.txt',
  'mobile/android/app/src/main/cpp/memoirllama.cpp',
  'mobile/android/app/src/main/java/local/memoir/mobile/MemoirRuntimePlugin.java',
  'mobile/android/app/src/main/java/local/memoir/mobile/MemoirFilesPlugin.java',
  'mobile/scripts/build-android-release.ps1',
  'mobile/scripts/verify-android-apk.mjs',
]

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
    present: exists(androidReleasePath),
    fresh: isArtifactFresh(androidReleasePath, androidReleaseSources),
    bytes: fileSize(androidReleasePath),
    debugPresent: exists(androidDebugPath),
    debugBytes: fileSize(androidDebugPath),
    note: isArtifactFresh(androidReleasePath, androidReleaseSources)
      ? 'Current signed-release APK exists; physical signed-release acceptance is still required.'
      : 'Release APK is absent or stale. Rebuild it with Android signing credentials after source verification.',
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
  android: passingEvidenceInRunDirectory('output/android-device-acceptance'),
  androidRelease: passingEvidenceInRunDirectory('output/android-release-acceptance'),
  ios: passingEvidence('output/ios-device-acceptance/result.json'),
}
const releaseReady = sourceReady
  && artifactStatus.windows.singleFilePresent
  && artifactStatus.android.present
  && artifactStatus.android.fresh
  && artifactStatus.ios.present
  && physicalEvidence.androidRelease
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
