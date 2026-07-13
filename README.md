# Memoir

Memoir is a private, local-first scrapbook app that turns 3 to 10 photos into an editable memoir. One React interface ships through a browser development path, a packaged Electron desktop app, and native Capacitor projects for Android and iOS.

## Current implementation

- Shared React 19/Vite UI for archive, photo ordering, compose, reader, editor, settings, and share/export.
- Browser development server with local Ollama support and a grounded fallback.
- Windows portable Electron build with an embedded `llama.cpp` runtime and pinned Qwen model.
- Android app with real JNI `llama.cpp` inference, bundled ML Kit photo labels, app-private verified model staging, and no network permissions in the final APK.
- iOS app with real Swift/`llama.cpp` inference, Apple Vision photo labels, protected local data, and a bundled verified model.
- Portable `.memoir`, HTML, Instagram-slide ZIP, diagnostics, and print/PDF-oriented exports.
- IndexedDB archive shared by the browser, Electron renderer, and native WebViews.

Mobile inference is fail-closed: Android and iOS never fall back to the configurable HTTP runtime. Emulator and simulator inference are proven in CI. Physical ARM device performance, signing, and store processing remain explicit release gates; see [physical-device acceptance](docs/15-physical-device-acceptance.md).

## Quick validation

From the repository root:

```powershell
npm run smoke
npm run release:readiness
```

`npm run smoke` runs repository tests, client tests, the production web build, and lint. `release:readiness` distinguishes source readiness from signed/hardware release readiness.

## Browser development

```powershell
npm install --prefix app
npm run dev:app
```

The browser path uses the local server at `http://127.0.0.1:8787`. Ollama is optional; browser development may use grounded fallback output when the local model server is unavailable.

## Windows desktop

```powershell
npm install --prefix desktop
npm run prepare:desktop-model
npm run dist:desktop:single-file
npm run smoke:desktop-single-file
npm run smoke:desktop-quality
```

The primary artifact is `desktop/dist/Memoir-0.1.0-portable.exe`. It must remain below the 2.5 GB packaging gate and should be signed before public distribution.

## Android

```powershell
npm install --prefix mobile
npm --prefix mobile run prepare:model
npm --prefix mobile run bootstrap:android -- -AcceptAndroidSdkLicenses
npm --prefix mobile run build:android:debug
```

The debug APK is `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. The build automatically verifies package id, signature, ABI, model allowlist, static C++ runtime packaging, and absence of mobile network permissions.

For a supported physical phone already placed in Airplane Mode:

```powershell
npm --prefix mobile run smoke:android:device
```

The runner refuses emulators and unsupported devices and does not change connectivity settings.

## iOS

The committed Xcode project is under `mobile/ios/App`. A macOS host with Xcode is required:

```bash
npm ci --prefix app
npm ci --prefix mobile
npm --prefix mobile run prepare:model
npm --prefix mobile run cap:sync
xcodebuild -project mobile/ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```

CI builds both a simulator inference smoke and an unsigned arm64 Release app. A signed physical-iPhone run and App Store archive still require an Apple Developer team, signing assets, Xcode 26+, and a supported iPhone.

## Privacy and storage boundary

- Photo labeling and text generation run locally.
- Raw photo bytes are not placed into the text-model prompt.
- Mobile model files and temporary assets live in app-private storage; iOS data is excluded from backup and protected where supported.
- Android’s merged APK has neither `INTERNET` nor `ACCESS_NETWORK_STATE`.
- Saved memoirs are still WebView/IndexedDB data, not an encrypted vault or cloud backup.
- Exported files leave the app-private boundary and should be handled accordingly.

## Documents

- [Release architecture blueprint](docs/ARCH_BLUEPRINT.md)
- [Platform support](docs/06-platform-support-and-performance.md)
- [Testing and release](docs/07-testing-and-release.md)
- [Store release checklist](docs/12-store-release-checklist.md)
- [Physical-device acceptance](docs/15-physical-device-acceptance.md)
- [Native runtime strategy](native/MOBILE_RUNTIME.md)
- [Native bridge contracts](native/BRIDGE_CONTRACTS.md)
