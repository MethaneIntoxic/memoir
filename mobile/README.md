# Memoir Mobile

This folder contains the production Capacitor Android and iOS projects. Both reuse `../app/dist`, the shared memoir contracts, the same pinned model, and a fail-closed `MemoirRuntime` bridge.

## Shared setup

```powershell
npm install
npm run prepare:model
npm run cap:sync
```

`prepare:model` validates Android/iOS asset parity and verifies the pinned GGUF before use. `cap:sync` rebuilds the renderer and reapplies the pinned iOS Swift package definition.

## Android

```powershell
npm run bootstrap:android -- -AcceptAndroidSdkLicenses
npm run build:android:debug
```

Review the SDK licenses before accepting them. Bootstrap installs a repository-local Microsoft JDK 21, Android platform 36, build-tools 35.0.0, CMake 3.22.1, and NDK 27.0.12077973.

The debug build automatically verifies:

- package `local.memoir.mobile`;
- one expected ABI (`arm64-v8a` for normal builds);
- exactly one pinned model and no projector;
- `libmemoirllama.so` with no `libc++_shared.so`;
- a valid APK signature;
- no `INTERNET` or `ACCESS_NETWORK_STATE` permission in the final APK.

Physical native inference acceptance:

```powershell
npm run smoke:android:device
```

Connect exactly one authorized 4 GB-class (or larger) arm64 device, enable Airplane Mode, and disable Wi-Fi first. The runner refuses emulators, validates API/RAM/storage, installs the verified APK, exercises public prepare/generate/rewrite/active-cancel behavior, and writes timestamped thermal, battery, memory, logcat, timing, package, and artifact evidence to `../output/android-device-acceptance`. It never changes connectivity settings.

Signed release builds require all four `MEMOIR_ANDROID_*` signing environment variables and fail closed before Gradle when any is missing or the keystore does not exist:

```powershell
npm run build:android:apk
```

The command uses the repository-local toolchain with two-worker limits, verifies that the APK is non-debuggable, offline-only, arm64-only, model-allowlisted, and signed by exactly one v2 signer, then copies the distributable APK and checksum metadata to `../output/releases/android`.

With the same signing environment and a physical offline phone connected, run the complete public-bridge suite against the signed APK:

```powershell
npm run smoke:android:release
```

Release acceptance re-signs only the disposable instrumentation APK with the release certificate, checks certificate parity, and writes timestamped evidence under `../output/android-release-acceptance`. Signing values are never written into evidence.

## iOS

Use macOS with Xcode. The project is `ios/App/App.xcodeproj`, scheme `App`. CI builds simulator inference plus an unsigned generic-iOS arm64 Release app. Signed device/archive work requires Xcode 26+, Apple Developer signing, and a supported iPhone.

```bash
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

See `../docs/15-physical-device-acceptance.md` for signing, device, offline, performance, and archive gates.

## Runtime behavior

The renderer stages at most five sanitized photos. ML Kit (Android) and Vision (iOS) reduce them to bounded local labels, then discard raw staged bytes. The text model receives only those labels, asset order/roles, tone, notes, and music cue. Both compose and first-action rewrite prepare the model before inference; mobile never falls back to HTTP.

Android compose uses a 2,048-token maximum context, 512-token prompt batches, 2-4 threads with two cores left free, and a 392-token maximum dynamic output. Generation/rewrite stop after 120/60 seconds, severe thermal state is checked every five seconds, and the model is unloaded after every operation. ARM64 builds use optimized native code and KleidiAI; do not use x86 emulator timing as a phone benchmark.

Portable, HTML, and diagnostic exports are written into a bounded app-private temporary directory and opened through the native system share sheet. Social carousel export renders ordered 1080 x 1350 PNG files and shares the set with `ACTION_SEND_MULTIPLE` on Android or the activity sheet on iOS; desktop keeps the ZIP download. TikTok documents multi-image intent support without Share Kit, so Memoir does not add social credentials or network access. The print/PDF action shares deterministic HTML so the device can offer its available print or PDF destination; confirm Instagram/TikTok ordering and all other target-app behavior during physical acceptance.
