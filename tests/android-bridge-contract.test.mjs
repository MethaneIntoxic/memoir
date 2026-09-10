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
  assert.equal(mobileRuntimeManifests.android.contextSize, 2048)
  assert.equal(mobileRuntimeManifests.android.maxTokens, 392)
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

  const capacitorConfig = JSON.parse(readFileSync(new URL('../mobile/capacitor.config.json', import.meta.url), 'utf8'))
  assert.equal(capacitorConfig.loggingBehavior, 'none')
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
  assert.match(plugin, /RUNTIME_ID = "embedded-llama"/)
  assert.match(plugin, /nativeUnload\(\)/)
  assert.match(plugin, /int tokenBudget = memoirTokenBudget\(request\)/)
  assert.match(plugin, /return 112 \+ \(assetCount \* 28\)/)
  assert.match(plugin, /String grammar = buildMemoirGrammar\(request\)/)
  assert.match(plugin, /grammarTerminal\("\\\"" \+ assetId \+ "\\\""\)/)
  assert.match(plugin, /nativeGenerate\([\s\S]*buildMemoirPrompt\(request\),[\s\S]*jobId,[\s\S]*grammar,[\s\S]*tokenBudget/)
  assert.match(plugin, /nativeGenerate\([\s\S]*buildRewritePrompt\(request\),[\s\S]*buildRewriteGrammar\(\),[\s\S]*224/)
  assert.doesNotMatch(plugin, /android-ai-native-inference-runtime-missing/)
  assert.match(cmake, /add_subdirectory\(.+llama\.cpp/)
  assert.match(cmake, /target_link_libraries\(memoirllama.+llama/)
  assert.match(cmake, /target_link_options\(memoirllama PRIVATE -nostdlib\+\+\)/)
  assert.match(cmake, /target_link_libraries\(memoirllama PRIVATE llama android log c\+\+_static c\+\+abi\)/)
  assert.match(cmake, /CMAKE_CXX_FLAGS_DEBUG.+-O3 -DNDEBUG/)
  assert.match(cmake, /ANDROID_ABI STREQUAL "arm64-v8a"[\s\S]*GGML_CPU_KLEIDIAI ON/)
  assert.doesNotMatch(cmake, /c\+\+_shared/)
  assert.match(native, /llama_model_load_from_file|llama_load_model_from_file/)
  assert.match(native, /llama_decode/)
  assert.match(native, /llama_token sampled_token\{\};[\s\S]*llama_batch_get_one\(&sampled_token, 1\)/)
  assert.doesNotMatch(native, /llama_batch_get_one\(&next_token, 1\)/)
  assert.match(native, /MIN_GENERATION_TOKENS = 8/)
  assert.match(native, /MAX_GENERATION_TOKENS = 900/)
  assert.match(native, /MIN_CONTEXT_TOKENS = 1024/)
  assert.match(native, /MAX_CONTEXT_TOKENS = 2048/)
  assert.match(native, /PROMPT_BATCH_TOKENS = 512/)
  assert.match(native, /online_threads - THREAD_HEADROOM/)
  assert.match(native, /llama_sampler_init_temp\(0\.30f\)/)
  assert.match(native, /MAX_GRAMMAR_BYTES = 32 \* 1024/)
  assert.match(native, /llama_sampler_init_grammar\(vocab, grammar\.c_str\(\), "root"\)/)
  assert.match(native, /generation-complete tokens=%d chars=%zu elapsedMs=%lld jsonComplete=%s/)
  assert.match(native, /json_object_complete/)
  assert.match(native, /MemoirRuntimePlugin_nativeUnload[\s\S]*llama_model_free/)
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
  assert.match(smokeTest, /activity\.getBridge\(\)\.getWebView\(\)/)
  assert.match(smokeTest, /window\.Capacitor\.Plugins\.MemoirRuntime/)
  assert.match(smokeTest, /await runtime\.prepare\(\)/)
  assert.match(smokeTest, /await runtime\.stageAsset/)
  assert.match(smokeTest, /await runtime\.generateMemoir/)
  assert.match(smokeTest, /android-runtime-active-cancel/)
  assert.match(smokeTest, /cancellationOutcomePromise/)
  assert.match(smokeTest, /native-ai-generation-cancelled/)
  assert.match(smokeTest, /data:image\/png;base64/)
  assert.match(smokeTest, /new File\(targetContext\.getFilesDir\(\), "memoir-models"\)/)
  assert.match(smokeTest, /assertEquals\(expectedSha256, sha256\(modelFile\)\)/)
  assert.match(smokeTest, /modelFile\.getName\(\) \+ "\.verified"/)
  assert.match(smokeTest, /assertEquals\("llama\.cpp-android-jni-ready", health\.getString\("nativeStatus"\)\)/)
  assert.match(smokeTest, /assertTrue\(health\.getBoolean\("available"\)\)/)
  assert.match(smokeTest, /assertEquals\(3, sections\.length\(\)\)/)

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
  assert.match(plugin, /finally \{[\s\S]{0,200}clearStagedAssetContext\(\)/)
  assert.match(gradle, /buildConfigField "boolean", "MEMOIR_EMULATOR_SMOKE"/)
  assert.match(plugin, /GENERATION_TIMEOUT_SECONDS = BuildConfig\.MEMOIR_EMULATOR_SMOKE \? 420L : 120L/)
  assert.match(plugin, /REWRITE_TIMEOUT_SECONDS = 60L/)
  assert.match(plugin, /THERMAL_POLL_SECONDS = 5L/)
  assert.match(plugin, /scheduleWithFixedDelay/)
  assert.match(plugin, /PowerManager\.THERMAL_STATUS_SEVERE/)
  assert.match(plugin, /native-ai-device-too-hot/)
  assert.match(plugin, /native-ai-generation-timeout/)
  assert.match(plugin, /thermalMonitor\.cancel\(false\)/)
  assert.match(plugin, /unloadNativeModelQuietly\(\)/)
  assert.doesNotMatch(plugin, /OnThermalStatusChangedListener/)
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
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/)
  assert.match(manifest, /android:icon="@drawable\/memoir_icon"/)
  assert.match(manifest, /android:roundIcon="@drawable\/memoir_icon"/)
  assert.match(manifest, /android\.permission\.INTERNET"[\s\S]*?tools:node="remove"/)
  assert.match(manifest, /android\.permission\.ACCESS_NETWORK_STATE"[\s\S]*?tools:node="remove"/)
  assert.doesNotMatch(paths, /external-path/)
  assert.match(paths, /path="exports\/"/)
  assert.match(gradle, /abiFilters "arm64-v8a"/)
  assert.match(gradle, /tasks\.register\("prepareMemoirBranding", Sync\)/)
  assert.match(gradle, /app\/public\/icons\/memoir-icon-1024\.png/)
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
  assert.match(plugin, /MINIMUM_PHYSICAL_MEMORY_BYTES = 3_500_000_000L/)
  assert.match(plugin, /MINIMUM_AVAILABLE_MEMORY_BYTES = 1_300_000_000L/)
  assert.match(plugin, /native-ai-unsupported-memory/)
  assert.match(plugin, /native-ai-insufficient-memory-now/)
  assert.match(plugin, /native-ai-insufficient-storage/)
  assert.match(plugin, /expectedSha256\.equalsIgnoreCase\(sha256\(target\)\)/)
  assert.doesNotMatch(plugin, /result\.put\("modelPath"/)
})

test('android tooling is reproducible and keeps sdk license acceptance explicit', () => {
  const bootstrap = readFileSync(new URL('../mobile/scripts/bootstrap-android-toolchain.ps1', import.meta.url), 'utf8')
  const build = readFileSync(new URL('../mobile/scripts/build-android-debug.ps1', import.meta.url), 'utf8')
  const releaseBuildPath = new URL('../mobile/scripts/build-android-release.ps1', import.meta.url)
  const mobilePackage = JSON.parse(readFileSync(new URL('../mobile/package.json', import.meta.url), 'utf8'))

  assert.match(bootstrap, /\[switch\]\$AcceptAndroidSdkLicenses/)
  assert.match(bootstrap, /commandlinetools-win-14742923_latest\.zip/)
  assert.match(bootstrap, /com\.android\.sdklib\.tool\.sdkmanager\.SdkManagerCli/)
  assert.match(bootstrap, /System\.Diagnostics\.ProcessStartInfo/)
  assert.match(bootstrap, /StandardInput\.Write/)
  assert.match(bootstrap, /licenses\? not accepted\|Skipping following packages/)
  assert.match(bootstrap, /requiredToolPaths/)
  assert.match(bootstrap, /ndk;27\.0\.12077973/)
  assert.equal(bootstrap.includes(String.raw`.Replace(':', '\:')`), true)
  assert.match(build, /:app:assembleDebug/)
  assert.match(build, /CMAKE_BUILD_PARALLEL_LEVEL = '2'/)
  assert.match(build, /--no-daemon --max-workers=2/)
  assert.match(build, /verify-android-apk\.mjs/)
  assert.equal(existsSync(releaseBuildPath), true)
  const releaseBuild = readFileSync(releaseBuildPath, 'utf8')
  assert.match(releaseBuild, /MEMOIR_ANDROID_KEYSTORE/)
  assert.match(releaseBuild, /MEMOIR_ANDROID_KEYSTORE_PASSWORD/)
  assert.match(releaseBuild, /MEMOIR_ANDROID_KEY_ALIAS/)
  assert.match(releaseBuild, /MEMOIR_ANDROID_KEY_PASSWORD/)
  assert.match(releaseBuild, /Test-Path -LiteralPath \$env:MEMOIR_ANDROID_KEYSTORE/)
  assert.match(releaseBuild, /:app:assembleRelease/)
  assert.match(releaseBuild, /CMAKE_BUILD_PARALLEL_LEVEL = '2'/)
  assert.match(releaseBuild, /--no-daemon --max-workers=2/)
  assert.match(releaseBuild, /--build-type release/)
  assert.match(releaseBuild, /output\\releases\\android/)
  assert.match(mobilePackage.scripts['bootstrap:android'], /bootstrap-android-toolchain\.ps1/)
  assert.match(mobilePackage.scripts['build:android:debug'], /build-android-debug\.ps1/)
  assert.match(mobilePackage.scripts['build:android:apk'], /build-android-release\.ps1/)
  assert.match(mobilePackage.scripts['verify:android:debug'], /verify-android-apk\.mjs --apk mobile\/android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk/)
  assert.match(mobilePackage.scripts['smoke:android:device'], /run-android-device-acceptance\.ps1/)
  assert.match(mobilePackage.scripts['smoke:android:release'], /run-android-device-acceptance\.ps1.+-BuildType Release/)
  assert.match(mobilePackage.scripts['prepare:model'], /prepare-mobile-model\.mjs/)
})

test('physical Android acceptance is fail-closed and preserves connectivity settings', () => {
  const runner = readFileSync(new URL('../mobile/scripts/run-android-device-acceptance.ps1', import.meta.url), 'utf8')
  const verifier = readFileSync(new URL('../mobile/scripts/verify-android-apk.mjs', import.meta.url), 'utf8')

  assert.match(runner, /refuses Android emulators/)
  assert.match(runner, /ValidateSet\('Debug', 'Release'\)/)
  assert.match(runner, /npm\.cmd run build:android:apk/)
  assert.match(runner, /:app:assembleDebugAndroidTest/)
  assert.match(runner, /apksigner\.jar/)
  assert.match(runner, /--ks-pass.+env:MEMOIR_ANDROID_KEYSTORE_PASSWORD/)
  assert.match(runner, /shell am instrument/)
  assert.match(runner, /android-release-acceptance/)
  assert.match(runner, /arm64-v8a/)
  assert.match(runner, /airplane_mode_on/)
  assert.match(runner, /wifi_on/)
  assert.match(runner, /will not change device connectivity/)
  assert.match(runner, /connectedDebugAndroidTest/)
  assert.match(runner, /dumpsys thermalservice/)
  assert.match(runner, /inferenceElapsedMs/)
  assert.match(runner, /buildType = \$buildTypeName/)
  assert.match(runner, /apkSha256/)
  assert.match(runner, /data:image/)
  assert.match(runner, /raw photo data or private prompt text/)
  assert.doesNotMatch(runner, /settings put global airplane_mode_on/)
  assert.match(verifier, /android\.permission\.INTERNET/)
  assert.match(verifier, /android\.permission\.ACCESS_NETWORK_STATE/)
  assert.match(verifier, /APK model allowlist mismatch/)
  assert.match(verifier, /apksigner/)
  assert.match(verifier, /output', 'toolchains', 'jdk-21/)
})
