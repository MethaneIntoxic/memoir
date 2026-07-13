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

test('mobile native AI bridge publishes platform-neutral methods', () => {
  assert.deepEqual(nativeBridgeContracts.MemoirRuntime, ['health', 'prepare', 'stageAsset', 'clearStagedAssets', 'generateMemoir', 'rewrite', 'cancelGeneration'])

  const adapter = readFileSync(new URL('../app/src/platform/runtime-adapter.ts', import.meta.url), 'utf8')
  assert.match(adapter, /registerPlugin<NativeRuntimeBridge>\(NATIVE_PLUGIN_NAME\)/)
  assert.match(adapter, /native-ai-plugin-unavailable/)
})

test('capacitor android project registers the Memoir Android AI plugin', () => {
  const pluginPath = new URL(
    '../mobile/android/app/src/main/java/local/memoir/mobile/MemoirRuntimePlugin.java',
    import.meta.url,
  )
  const activityPath = new URL(
    '../mobile/android/app/src/main/java/local/memoir/mobile/MainActivity.java',
    import.meta.url,
  )

  assert.equal(existsSync(pluginPath), true)
  assert.match(readFileSync(activityPath, 'utf8'), /registerPlugin\(MemoirRuntimePlugin\.class\)/)
  assert.match(readFileSync(pluginPath, 'utf8'), /@CapacitorPlugin\(name = "MemoirRuntime"\)/)
  assert.match(readFileSync(pluginPath, 'utf8'), /System\.loadLibrary\("memoirllama"\)/)
  assert.equal(existsSync(new URL('../mobile/android/app/src/main/cpp/CMakeLists.txt', import.meta.url)), true)
})

test('android native AI bridge is wired to real llama.cpp inference', () => {
  const pluginPath = new URL(
    '../mobile/android/app/src/main/java/local/memoir/mobile/MemoirRuntimePlugin.java',
    import.meta.url,
  )
  const cmakePath = new URL('../mobile/android/app/src/main/cpp/CMakeLists.txt', import.meta.url)
  const nativePath = new URL('../mobile/android/app/src/main/cpp/memoirllama.cpp', import.meta.url)

  const plugin = readFileSync(pluginPath, 'utf8')
  const cmake = readFileSync(cmakePath, 'utf8')
  const native = readFileSync(nativePath, 'utf8')

  assert.match(plugin, /nativeGenerate\(/)
  assert.match(plugin, /nativeGenerate\(modelFile\(\)\.getAbsolutePath\(\), buildMemoirPrompt\(request\), jobId, 700\)/)
  assert.match(plugin, /nativeGenerate\(modelFile\(\)\.getAbsolutePath\(\), buildRewritePrompt\(request\), jobId, 400\)/)
  assert.doesNotMatch(plugin, /android-ai-native-inference-runtime-missing/)
  assert.match(cmake, /add_subdirectory\(.+llama\.cpp/)
  assert.match(cmake, /target_link_libraries\(memoirllama.+llama/)
  assert.match(cmake, /target_link_options\(memoirllama PRIVATE -nostdlib\+\+\)/)
  assert.match(cmake, /target_link_libraries\(memoirllama PRIVATE llama android log c\+\+_static c\+\+abi\)/)
  assert.doesNotMatch(cmake, /c\+\+_shared/)
  assert.match(native, /llama_model_load_from_file|llama_load_model_from_file/)
  assert.match(native, /llama_decode/)
  assert.match(native, /llama_token sampled_token\{\};[\s\S]*llama_batch_get_one\(&sampled_token, 1\)/)
  assert.doesNotMatch(native, /llama_batch_get_one\(&next_token, 1\)/)
  assert.match(native, /MIN_GENERATION_TOKENS = 8/)
  assert.match(native, /MAX_GENERATION_TOKENS = 900/)
})

test('android emulator inference smoke is explicit and cannot weaken release ABI', () => {
  const gradle = readFileSync(new URL('../mobile/android/app/build.gradle', import.meta.url), 'utf8')
  const workflow = readFileSync(new URL('../.github/workflows/native-build.yml', import.meta.url), 'utf8')
  const smokeScriptPath = new URL('../mobile/scripts/run-android-emulator-smoke.sh', import.meta.url)
  const smokeTestPath = new URL(
    '../mobile/android/app/src/androidTest/java/local/memoir/mobile/AndroidRuntimeInferenceSmokeTest.java',
    import.meta.url,
  )
  const staleTestPath = new URL(
    '../mobile/android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java',
    import.meta.url,
  )

  assert.match(gradle, /gradleProperty\("memoirEmulatorSmoke"\)/)
  assert.match(gradle, /memoirEmulatorSmokeProperty != "true"/)
  assert.match(gradle, /memoirEmulatorSmoke[\s\S]*abiFilters "x86_64"[\s\S]*else[\s\S]*abiFilters "arm64-v8a"/)
  assert.match(gradle, /memoirEmulatorSmoke[\s\S]*graph\.allTasks[\s\S]*contains\("release"\)/)

  assert.equal(existsSync(smokeTestPath), true)
  assert.equal(existsSync(staleTestPath), false)
  const smokeTest = readFileSync(smokeTestPath, 'utf8')
  assert.match(smokeTest, /getPlugin\("MemoirRuntime"\)/)
  assert.match(smokeTest, /getDeclaredMethod\(\s*"stageVerifiedAsset"/)
  assert.match(smokeTest, /new File\(targetContext\.getFilesDir\(\), "memoir-models"\)/)
  assert.match(smokeTest, /assertEquals\(expectedSha256, sha256\(modelFile\)\)/)
  assert.match(smokeTest, /modelFile\.getName\(\) \+ "\.verified"/)
  assert.match(smokeTest, /getDeclaredMethod\(\s*"nativeGenerate"/)
  assert.match(smokeTest, /"android-runtime-smoke",\s*32/)
  assert.match(smokeTest, /assertFalse\(generated\.trim\(\)\.isEmpty\(\)\)/)

  assert.match(workflow, /android-emulator-inference:/)
  assert.match(workflow, /ReactiveCircus\/android-emulator-runner@a421e43855164a8197daf9d8d40fe71c6996bb0d/)
  assert.match(workflow, /arch: x86_64/)
  assert.match(workflow, /ram-size: 8192M/)
  assert.match(workflow, /script: bash "\$GITHUB_WORKSPACE\/mobile\/scripts\/run-android-emulator-smoke\.sh"/)
  assert.equal(existsSync(smokeScriptPath), true)
  const smokeScript = readFileSync(smokeScriptPath, 'utf8')
  assert.match(smokeScript, /set -euo pipefail/)
  assert.match(smokeScript, /trap capture_logcat EXIT/)
  assert.match(smokeScript, /:app:connectedDebugAndroidTest \\\n\s+-PmemoirEmulatorSmoke=true/)
  assert.match(smokeScript, /local\.memoir\.mobile\.AndroidRuntimeInferenceSmokeTest/)
  assert.match(smokeScript, /lib\/x86_64\/libmemoirllama\.so/)
})

test('android photo context is bounded, offline, and cleared after generation', () => {
  const plugin = readFileSync(
    new URL('../mobile/android/app/src/main/java/local/memoir/mobile/MemoirRuntimePlugin.java', import.meta.url),
    'utf8',
  )
  const gradle = readFileSync(new URL('../mobile/android/app/build.gradle', import.meta.url), 'utf8')

  assert.match(gradle, /com\.google\.mlkit:image-labeling:17\.0\.9/)
  assert.match(plugin, /public void stageAsset\(PluginCall call\)/)
  assert.match(plugin, /MAX_DECODED_ASSET_BYTES = 12 \* 1024 \* 1024/)
  assert.match(plugin, /MAX_IMAGE_PIXELS = 40_000_000L/)
  assert.match(plugin, /ImageLabeling\.getClient\(ImageLabelerOptions\.DEFAULT_OPTIONS\)/)
  assert.match(plugin, /MAX_PHOTO_CONTEXT_ASSETS = 5/)
  assert.match(plugin, /native-ai-asset-not-staged/)
  assert.match(plugin, /finally \{\s*clearStagedAssetContext\(\)/)
  assert.doesNotMatch(plugin, /result\.put\("labels"/)
  assert.doesNotMatch(plugin, /result\.put\(".*Path"/)
})

test('android runtime is fail-closed and stages only the model used by text inference', () => {
  const manifest = readFileSync(new URL('../mobile/android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
  const paths = readFileSync(new URL('../mobile/android/app/src/main/res/xml/file_paths.xml', import.meta.url), 'utf8')
  const gradle = readFileSync(new URL('../mobile/android/app/build.gradle', import.meta.url), 'utf8')
  const plugin = readFileSync(
    new URL('../mobile/android/app/src/main/java/local/memoir/mobile/MemoirRuntimePlugin.java', import.meta.url),
    'utf8',
  )

  assert.match(manifest, /android:allowBackup="false"/)
  assert.doesNotMatch(manifest, /android\.permission\.INTERNET/)
  assert.doesNotMatch(paths, /external-path/)
  assert.match(paths, /path="exports\/"/)
  assert.match(gradle, /abiFilters "arm64-v8a"/)
  assert.match(gradle, /ndkVersion "27\.0\.12077973"/)
  assert.match(gradle, /version "3\.22\.1"/)
  assert.match(gradle, /commandLine "git", "init"/)
  assert.match(gradle, /commandLine "git", "fetch", "--depth", "1", "origin", memoirLlamaCppCommit/)
  assert.doesNotMatch(gradle, /--filter=blob:none/)
  const modelAllowlist = gradle.match(/def memoirModelFiles = \[[\s\S]*?\]/)?.[0] || ''
  assert.doesNotMatch(modelAllowlist, /mmproj/)
  assert.match(gradle, /tasks\.register\("prepareMemoirModelAssets", Sync\)/)
  assert.match(gradle, /outputs\.upToDateWhen[\s\S]*packagedFiles\.size\(\) == memoirModelFiles\.size\(\)/)
  assert.match(gradle, /memoirModelFiles\.every \{ new File\(memoirGeneratedAssetDir, it\)\.isFile\(\) \}/)
  assert.match(plugin, /\.part/)
  assert.match(plugin, /getFD\(\)\.sync\(\)/)
  assert.doesNotMatch(plugin, /result\.put\("modelPath"/)
})

test('android tooling is reproducible and keeps sdk license acceptance explicit', () => {
  const bootstrap = readFileSync(new URL('../mobile/scripts/bootstrap-android-toolchain.ps1', import.meta.url), 'utf8')
  const build = readFileSync(new URL('../mobile/scripts/build-android-debug.ps1', import.meta.url), 'utf8')
  const mobilePackage = JSON.parse(readFileSync(new URL('../mobile/package.json', import.meta.url), 'utf8'))

  assert.match(bootstrap, /\[switch\]\$AcceptAndroidSdkLicenses/)
  assert.match(bootstrap, /commandlinetools-win-14742923_latest\.zip/)
  assert.match(bootstrap, /com\.android\.sdklib\.tool\.sdkmanager\.SdkManagerCli/)
  assert.match(bootstrap, /System\.Diagnostics\.ProcessStartInfo/)
  assert.match(bootstrap, /StandardInput\.Write/)
  assert.match(bootstrap, /licenses\? not accepted\|Skipping following packages/)
  assert.match(bootstrap, /requiredToolPaths/)
  assert.match(bootstrap, /ndk;27\.0\.12077973/)
  assert.match(build, /:app:assembleDebug/)
  assert.match(mobilePackage.scripts['bootstrap:android'], /bootstrap-android-toolchain\.ps1/)
  assert.match(mobilePackage.scripts['build:android:debug'], /build-android-debug\.ps1/)
  assert.match(mobilePackage.scripts['prepare:model'], /prepare-mobile-model\.mjs/)
})
