import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { mobileRuntimeManifests } from '../packages/memoir-core/index.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('ios runtime bundles the pinned model and official llama xcframework', () => {
  const packageSwift = read('../mobile/ios/App/CapApp-SPM/Package.swift')
  const project = read('../mobile/ios/App/App.xcodeproj/project.pbxproj')

  assert.equal(mobileRuntimeManifests.ios.deliveryMode, 'bundled-app-resource')
  assert.match(packageSwift, /llama\.cpp\/releases\/download\/b8931\/llama-b8931-xcframework\.zip/)
  assert.match(packageSwift, /checksum: "1c70dd0c300115d1accb2c70d008d28d29022be7e86235dbce68b0c9478f5dbb"/)
  assert.match(project, /Qwen_Qwen3\.5-0\.8B-Q5_K_M\.gguf in Resources/)
})

test('ios registers the platform-neutral runtime plugin with bounded local inference', () => {
  const bridge = read('../mobile/ios/App/App/MemoirBridgeViewController.swift')
  const plugin = read('../mobile/ios/App/CapApp-SPM/Sources/CapApp-SPM/MemoirRuntimePlugin.swift')
  const enginePath = new URL('../mobile/ios/App/CapApp-SPM/Sources/CapApp-SPM/MemoirRuntimeEngine.swift', import.meta.url)

  assert.equal(existsSync(enginePath), true)
  assert.match(bridge, /registerPluginInstance\(MemoirRuntimePlugin\(\)\)/)
  assert.match(plugin, /public let jsName = "MemoirRuntime"/)
  for (const method of ['health', 'prepare', 'stageAsset', 'clearStagedAssets', 'generateMemoir', 'rewrite', 'cancelGeneration']) {
    assert.match(plugin, new RegExp(`CAPPluginMethod\\(name: "${method}"`))
  }
  assert.match(plugin, /request\.text\.count <= 12_000/)
  assert.match(plugin, /SHA256\(\)/)
  assert.match(plugin, /import Vision/)
  assert.match(plugin, /VNClassifyImageRequest\(\)/)
  assert.match(plugin, /assets\.prefix\(maximumPhotoContextAssets\)/)
  assert.match(plugin, /defer \{ self\.clearStagedAssetState\(\) \}/)
  assert.match(plugin, /minimumPhysicalMemoryBytes: UInt64 = 7_000_000_000/)
  assert.match(plugin, /throw runtimeError\("native-ai-unsupported-memory"/)
  assert.doesNotMatch(plugin, /self\.runtimeError/)
  assert.doesNotMatch(plugin, /"dataUrl": request\.dataUrl/)
})

test('ios local data is excluded from backup and covered by file protection', () => {
  const delegate = read('../mobile/ios/App/App/AppDelegate.swift')
  const privacy = read('../mobile/ios/App/App/PrivacyInfo.xcprivacy')
  const storyboard = read('../mobile/ios/App/App/Base.lproj/Main.storyboard')

  assert.match(delegate, /isExcludedFromBackup = true/)
  assert.match(delegate, /completeUntilFirstUserAuthentication/)
  assert.match(privacy, /NSPrivacyTracking/)
  assert.match(storyboard, /customClass="MemoirBridgeViewController"/)
})

test('capacitor sync reapplies the pinned ios runtime package', () => {
  const mobilePackage = JSON.parse(read('../mobile/package.json'))
  const configureScript = read('../mobile/scripts/configure-ios-runtime.mjs')
  assert.match(mobilePackage.scripts['cap:sync'], /configure-ios-runtime\.mjs/)
  assert.equal(existsSync(new URL('../mobile/scripts/configure-ios-runtime.mjs', import.meta.url)), true)
  assert.match(configureScript, /memoir-icon-1024\.png/)
  assert.match(configureScript, /AppIcon-512@2x\.png/)
  assert.match(configureScript, /Splash\.imageset/)
})

test('native build workflow compiles android and ios on their supported hosts', () => {
  const workflow = read('../.github/workflows/native-build.yml')
  const delegate = read('../mobile/ios/App/App/AppDelegate.swift')
  const sharedScheme = read('../mobile/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme')
  assert.match(workflow, /runs-on: ubuntu-latest/)
  assert.match(workflow, /find "\$ANDROID_SDK_ROOT\/cmdline-tools"/)
  assert.match(workflow, /--licenses/)
  assert.match(workflow, /for attempt in 1 2 3/)
  assert.match(workflow, /ANDROID_SDK_ROOT\/ndk\/27\.0\.12077973/)
  assert.match(workflow, /\.\/gradlew :app:assembleDebug/)
  assert.match(workflow, /runs-on: macos-15-intel/)
  assert.match(workflow, /platform=iOS Simulator,id=\$IOS_SIMULATOR_ID/)
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/)
  assert.match(workflow, /generic\/platform=iOS/)
  assert.match(workflow, /Release-iphoneos\/App\.app/)
  assert.match(workflow, /lipo -archs "\$app_path\/App"/)
  assert.match(workflow, /MEMOIR_CI_INFERENCE_SMOKE/)
  assert.match(workflow, /xcrun simctl launch "--console-pty"|"launch", "--console-pty"/)
  assert.match(workflow, /MEMOIR_IOS_INFERENCE_SMOKE_OK output_bytes=/)
  assert.match(delegate, /#if MEMOIR_CI_INFERENCE_SMOKE/)
  assert.match(delegate, /MemoirRuntimeEngine\(\)/)
  assert.match(delegate, /MEMOIR_IOS_INFERENCE_SMOKE_OK output_bytes=/)
  assert.doesNotMatch(delegate, /MEMOIR_IOS_INFERENCE_SMOKE_OK.*\(output\)/)
  assert.match(sharedScheme, /BlueprintIdentifier = "504EC3031FED79650016851F"/)
  assert.match(sharedScheme, /ReferencedContainer = "container:App\.xcodeproj"/)
})
