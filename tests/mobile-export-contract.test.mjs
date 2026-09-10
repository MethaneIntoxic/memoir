import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { nativeBridgeContracts } from '../packages/memoir-core/index.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('renderer routes mobile exports to the native share bridge', () => {
  const adapter = read('../app/src/platform/export-adapter.ts')
  const exports = read('../app/src/memoir/export.ts')

  assert.match(adapter, /registerPlugin<NativeFilesBridge>\('MemoirFiles'\)/)
  assert.match(adapter, /Capacitor\.isPluginAvailable\('MemoirFiles'\)/)
  assert.match(adapter, /MemoirFiles\.shareFile/)
  assert.match(adapter, /MemoirFiles\.shareFiles/)
  assert.match(exports, /await deliverTextFile/)
  assert.match(exports, /await deliverBinaryFile/)
  assert.match(exports, /await deliverBinaryFiles/)
  assert.match(exports, /renderInstagramFeedSlideFiles/)
  assert.match(exports, /if \(isNativeMobile\(\)\)/)
  assert.deepEqual(nativeBridgeContracts.MemoirFiles, ['shareFile', 'shareFiles'])
})

test('android native share uses only app-private bounded files', () => {
  const activity = read('../mobile/android/app/src/main/java/local/memoir/mobile/MainActivity.java')
  const pluginPath = new URL('../mobile/android/app/src/main/java/local/memoir/mobile/MemoirFilesPlugin.java', import.meta.url)
  const plugin = read('../mobile/android/app/src/main/java/local/memoir/mobile/MemoirFilesPlugin.java')
  const paths = read('../mobile/android/app/src/main/res/xml/file_paths.xml')

  assert.equal(existsSync(pluginPath), true)
  assert.match(activity, /registerPlugin\(MemoirFilesPlugin\.class\)/)
  assert.match(plugin, /@CapacitorPlugin\(name = "MemoirFiles"\)/)
  assert.match(plugin, /MAX_FILE_BYTES = 48 \* 1024 \* 1024/)
  assert.match(plugin, /getContext\(\)\.getCacheDir\(\), "exports"/)
  assert.match(plugin, /getCanonicalFile\(\)/)
  assert.match(plugin, /FileProvider\.getUriForFile/)
  assert.match(plugin, /Intent\.ACTION_SEND/)
  assert.match(plugin, /Intent\.ACTION_SEND_MULTIPLE/)
  assert.match(plugin, /public void shareFiles\(PluginCall call\)/)
  assert.match(plugin, /MAX_SHARED_FILES = 10/)
  assert.doesNotMatch(plugin, /Environment\.getExternalStorage/)
  assert.match(paths, /cache-path[\s\S]*path="exports\/"/)
})

test('ios native share protects temporary output and presents the system sheet', () => {
  const bridge = read('../mobile/ios/App/App/MemoirBridgeViewController.swift')
  const plugin = read('../mobile/ios/App/CapApp-SPM/Sources/CapApp-SPM/MemoirFilesPlugin.swift')

  assert.match(bridge, /registerPluginInstance\(MemoirFilesPlugin\(\)\)/)
  assert.match(plugin, /public let jsName = "MemoirFiles"/)
  assert.match(plugin, /public let pluginMethods: \[CAPPluginMethod\]/)
  assert.match(plugin, /maximumFileBytes = 48 \* 1024 \* 1024/)
  assert.match(plugin, /completeFileProtectionUntilFirstUserAuthentication/)
  assert.match(plugin, /isExcludedFromBackup = true/)
  assert.match(plugin, /UIActivityViewController/)
  assert.match(plugin, /@objc public func shareFiles\(_ call: CAPPluginCall\)/)
})
