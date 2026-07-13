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

Connect exactly one authorized arm64 device, enable Airplane Mode, and disable Wi-Fi first. The runner refuses emulators, validates API/RAM/storage, installs the verified APK, runs native inference instrumentation, and writes evidence to `../output/android-device-acceptance`. It never changes connectivity settings.

Signed release builds require all four `MEMOIR_ANDROID_*` signing environment variables and fail closed when any is missing.

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

Portable, HTML, slide ZIP, and diagnostic exports are written into a bounded app-private temporary directory and opened through the native system share sheet. The print/PDF action shares deterministic HTML so the device can offer its available print or PDF destination; confirm that behavior during physical acceptance.
