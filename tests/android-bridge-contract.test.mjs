import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { mobileRuntimeManifests, nativeBridgeContracts, releaseArtifacts } from '../packages/memoir-core/index.mjs'

test('android release target is a direct APK with qwen35 q5 offline assets', () => {
  assert.equal(releaseArtifacts.android.kind, 'android-sideload-apk')
  assert.equal(releaseArtifacts.android.extension, 'apk')
  assert.equal(releaseArtifacts.android.storeUpload, false)
  assert.equal(mobileRuntimeManifests.android.deliveryMode, 'direct-apk-assets')
  assert.equal(mobileRuntimeManifests.android.modelFileName, 'Qwen_Qwen3.5-0.8B-Q5_K_M.gguf')
})

test('android native AI bridge publishes required methods', () => {
  assert.deepEqual(nativeBridgeContracts.AndroidAiBridge, ['health', 'generateMemoir', 'cancelGeneration'])

  const typeFile = readFileSync(new URL('../app/src/electron-env.d.ts', import.meta.url), 'utf8')
  assert.match(typeFile, /memoirAndroidAi\?:/)
  assert.match(typeFile, /generateMemoir\(payload: unknown\): Promise<unknown>/)
})

test('capacitor android project registers the Memoir Android AI plugin', () => {
  const pluginPath = new URL(
    '../mobile/android/app/src/main/java/local/memoir/mobile/MemoirAndroidAiPlugin.java',
    import.meta.url,
  )
  const activityPath = new URL(
    '../mobile/android/app/src/main/java/local/memoir/mobile/MainActivity.java',
    import.meta.url,
  )

  assert.equal(existsSync(pluginPath), true)
  assert.match(readFileSync(activityPath, 'utf8'), /registerPlugin\(MemoirAndroidAiPlugin\.class\)/)
  assert.match(readFileSync(pluginPath, 'utf8'), /System\.loadLibrary\("memoirllama"\)/)
  assert.equal(existsSync(new URL('../mobile/android/app/src/main/cpp/CMakeLists.txt', import.meta.url)), true)
})

test('android native AI bridge is wired to real llama.cpp inference', () => {
  const pluginPath = new URL(
    '../mobile/android/app/src/main/java/local/memoir/mobile/MemoirAndroidAiPlugin.java',
    import.meta.url,
  )
  const cmakePath = new URL('../mobile/android/app/src/main/cpp/CMakeLists.txt', import.meta.url)
  const nativePath = new URL('../mobile/android/app/src/main/cpp/memoirllama.cpp', import.meta.url)

  const plugin = readFileSync(pluginPath, 'utf8')
  const cmake = readFileSync(cmakePath, 'utf8')
  const native = readFileSync(nativePath, 'utf8')

  assert.match(plugin, /nativeGenerate\(/)
  assert.doesNotMatch(plugin, /android-ai-native-inference-runtime-missing/)
  assert.match(cmake, /add_subdirectory\(.+llama\.cpp/)
  assert.match(cmake, /target_link_libraries\(memoirllama.+llama/)
  assert.match(native, /llama_model_load_from_file|llama_load_model_from_file/)
  assert.match(native, /llama_decode/)
})
