# Physical Device Acceptance

This is the final mobile hardware gate. Emulator/simulator success is prerequisite evidence, not a substitute.

## Evidence rules

- Test the exact commit and artifact intended for release.
- Record artifact hash/signature, device model, OS, RAM, free storage, thermal state, and test time.
- Begin with Wi-Fi and cellular unavailable. Do not let automation silently change or restore connectivity.
- Capture stable status/timing/error codes only. Do not record prompts, generated memoir text, raw photos, model paths, or personal data.
- Repeat on the lowest hardware the product claims to support.

## Android automated preflight

Prerequisites: exactly one authorized physical arm64 device, API 24+, 4 GB RAM class, at least 2,000,000 KiB free under `/data`, Airplane Mode on, Wi-Fi off.

```powershell
npm --prefix mobile run smoke:android:device
```

Optional explicit serial:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File mobile/scripts/run-android-device-acceptance.ps1 -Serial DEVICE_SERIAL
```

The runner builds/verifies the arm64 debug APK with at most two Gradle workers, rejects emulators, installs and clears app data, confirms the installed package lacks network permissions, runs the public Capacitor bridge instrumentation, and captures package, logcat, memory, battery, elapsed-time, and before/after thermal evidence under a timestamped `output/android-device-acceptance/<run-id>` directory. It fails on prompt/photo leakage, ANR, crash, or OOM signatures.

### Current emulator prerequisite evidence

On 2026-08-12, a direct API 35 x86_64 JNI harness completed constrained generation with the bundled and SHA-256-verified Qwen Q5 model: 127 generated tokens, 586 output characters, three ordered sections, no repair generation, 258,921 ms, and roughly 1.1 GB resident process memory. A subsequent production-WebView run proved public `prepare()` and three `stageAsset()` calls; its request-specific grammar completed one native JSON generation in 355,735 ms, but the callback raced the then-current test deadline. This is partial emulator evidence only. Emulator inference was stopped because x86 emulation is excessively CPU-heavy and is not a valid phone-performance proxy; do not run it on the development computer again.

The current runtime differs materially from that snapshot: Debug JNI is optimized, arm64 enables KleidiAI, compose is one grammar-constrained pass, context/output/thread counts are bounded, thermal state is polled, production has 120/60-second watchdogs, and the model unloads after every operation. These changes compile but have not been executed against the model on current hardware.

On 2026-08-13, the current arm64 Debug APK rebuilt and passed static package verification at 654,747,890 bytes with SHA-256 `64AB0477BE0659EB0EB315219A84461A0BD86C6B289A0D4C76CA17C6B7B89826`. It contains only the pinned Qwen model plus `arm64-v8a` `libmemoirllama.so` and ML Kit's native pipeline, with 27.55 MiB overhead beyond the model. This is an installable development artifact, not signed-Release or physical-inference evidence.

## Android public-flow checklist

Run this first against Debug, then repeat against the signed Release APK:

1. Cold launch offline; `health()` shows preparation required without attempting HTTP.
2. `prepare()` reaches ready with exact runtime/model identity and no `.part` file left behind.
3. Force-stop/relaunch; health returns ready without recopying the model.
4. Stage three representative sanitized photos through the production UI and generate a valid, ordered memoir offline.
5. On a clean install/imported memoir, invoke rewrite before any compose action; it prepares automatically and returns bounded non-empty text.
6. Start a rewrite, cancel after native inference begins, require `native-ai-generation-cancelled` with no late success, then generate successfully again. The automated physical runner exercises this active-cancellation path.
7. Background/foreground during normal use; save, force-stop, relaunch, and reopen the memoir.
8. Export portable/HTML/slides and verify each file is accessible through the intended share destination. Share the 1080 x 1350 PNG set through Android Sharesheet and verify ordered multi-image selection in Instagram and TikTok. Verify PDF behavior separately.
9. Capture prepare/generate/rewrite/cancel latency, peak memory, thermal status, logcat, and absence of crash/ANR/OOM or sensitive logging.
10. Corrupt/delete the private model in a test-only build, rerun prepare, and verify exact size/hash recovery.

TikTok officially supports multi-image `ACTION_SEND_MULTIPLE` intents and turns the images into a slideshow. Memoir sends 3-10 ordered `image/png` content URIs with read-only grants through the system chooser. Instagram and TikTok ordering still require acceptance against the installed target-app versions; no SDK, account login, client key, or network permission is added merely to bypass user confirmation.

Signed APK configuration:

```powershell
$env:MEMOIR_ANDROID_KEYSTORE='C:\secure\memoir-release.jks'
$env:MEMOIR_ANDROID_KEYSTORE_PASSWORD='...'
$env:MEMOIR_ANDROID_KEY_ALIAS='memoir'
$env:MEMOIR_ANDROID_KEY_PASSWORD='...'
npm --prefix mobile run build:android:apk
npm --prefix mobile run smoke:android:release
```

The release build verifies package, model, ABI, permissions, non-debuggable state, one-signer v2 signature, and writes the distributable APK plus checksum metadata under `output/releases/android`. Release acceptance installs that exact APK, re-signs only the disposable instrumentation APK with the same certificate, verifies signer parity, runs the public prepare/generate/rewrite/active-cancel flow, and writes timestamped proof under `output/android-release-acceptance`.

Never commit or include signing values in evidence. Keep the keystore backed up securely because future Android updates must use the same signing identity.

## iPhone build and run

Prerequisites: macOS, [Xcode 26+ as required for current App Store uploads](https://developer.apple.com/news/upcoming-requirements/), Apple Developer team, registered bundle id, signing/provisioning, supported physical iPhone.

```bash
npm ci --prefix app
npm ci --prefix mobile
npm --prefix mobile run prepare:model
npm --prefix mobile run cap:sync

xcodebuild \
  -project mobile/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination "id=$IOS_DEVICE_ID" \
  -derivedDataPath output/ios-device-derived \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID" \
  -allowProvisioningUpdates \
  build
```

Repeat the Android public-flow checklist on iPhone, substituting Vision staging and iOS lifecycle evidence. Also record `ProcessInfo.thermalState`, memory-warning/background unload recovery, final data-protection/backup attributes, and a deny-all proxy or Instruments network capture.

## iOS archive gate

```bash
xcodebuild archive \
  -project mobile/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath output/Memoir.xcarchive \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID" \
  -allowProvisioningUpdates
```

Verify the archived app and pinned model:

```bash
APP='output/Memoir.xcarchive/Products/Applications/App.app'
lipo -archs "$APP/App"
codesign --verify --deep --strict --verbose=2 "$APP"
codesign -d --entitlements :- "$APP"
shasum -a 256 "$APP/Qwen_Qwen3.5-0.8B-Q5_K_M.gguf"
stat -f%z "$APP/Qwen_Qwen3.5-0.8B-Q5_K_M.gguf"
```

The app/runtime must be arm64; the model hash must be `1214AFEBFE07D894E550505E3DAB6E913953A3FB123EA425D7D7731962479FCA` and size `625860768`. Validate/upload through Xcode or App Store Connect, install the processed TestFlight build, and repeat the complete offline acceptance.

## Exit criteria

Mobile release status may change only when Debug/device behavior, signed release behavior, offline proof, public bridge flow, lifecycle, export/share, memory/thermal measurements, and distribution-channel processing are all recorded. Any missing item remains explicitly unverified.
