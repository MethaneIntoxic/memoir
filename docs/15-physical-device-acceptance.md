# Physical Device Acceptance

This is the final mobile hardware gate. Emulator/simulator success is prerequisite evidence, not a substitute.

## Evidence rules

- Test the exact commit and artifact intended for release.
- Record artifact hash/signature, device model, OS, RAM, free storage, thermal state, and test time.
- Begin with Wi-Fi and cellular unavailable. Do not let automation silently change or restore connectivity.
- Capture stable status/timing/error codes only. Do not record prompts, generated memoir text, raw photos, model paths, or personal data.
- Repeat on the lowest hardware the product claims to support.

## Android automated preflight

Prerequisites: exactly one authorized physical arm64 device, API 24+, 8 GB RAM class, at least 2,000,000 KiB free under `/data`, Airplane Mode on, Wi-Fi off.

```powershell
npm --prefix mobile run smoke:android:device
```

Optional explicit serial:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File mobile/scripts/run-android-device-acceptance.ps1 -Serial DEVICE_SERIAL
```

The runner builds/verifies the arm64 debug APK, rejects emulators, installs and clears app data, confirms the installed package lacks network permissions, runs the real JNI inference instrumentation, and captures package/logcat/memory evidence under `output/android-device-acceptance`.

## Android public-flow checklist

Run this first against Debug, then repeat against the signed Release APK:

1. Cold launch offline; `health()` shows preparation required without attempting HTTP.
2. `prepare()` reaches ready with exact runtime/model identity and no `.part` file left behind.
3. Force-stop/relaunch; health returns ready without recopying the model.
4. Stage three representative sanitized photos through the production UI and generate a valid, ordered memoir offline.
5. On a clean install/imported memoir, invoke rewrite before any compose action; it prepares automatically and returns bounded non-empty text.
6. Start a longer generation, cancel after inference begins, require prompt cancellation/no late success, then generate successfully again.
7. Background/foreground during normal use; save, force-stop, relaunch, and reopen the memoir.
8. Export portable/HTML/slides and verify each file is accessible through the intended share destination. Verify PDF behavior separately.
9. Capture prepare/generate/rewrite/cancel latency, peak memory, thermal status, logcat, and absence of crash/ANR/OOM or sensitive logging.
10. Corrupt/delete the private model in a test-only build, rerun prepare, and verify exact size/hash recovery.

Signed APK configuration:

```powershell
$env:MEMOIR_ANDROID_KEYSTORE='C:\secure\memoir-release.jks'
$env:MEMOIR_ANDROID_KEYSTORE_PASSWORD='...'
$env:MEMOIR_ANDROID_KEY_ALIAS='memoir'
$env:MEMOIR_ANDROID_KEY_PASSWORD='...'
npm --prefix mobile run build:android:apk
node mobile/scripts/verify-android-apk.mjs --apk mobile/android/app/build/outputs/apk/release/app-release.apk --abi arm64-v8a
```

Never commit or include signing values in evidence.

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
