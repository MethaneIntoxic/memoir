# Memoir

**Live Web App (Free, No Login):** https://memoir.memoir-press.workers.dev/

Memoir turns 3 to 10 camera roll photos into a tactile 35mm scrapbook zine — featuring a brush-to-develop Darkroom tray, 3D flip prints, automatic Color DNA palettes, procedural lo-fi Cinema Reels, Contact Sheet posters, and standalone interactive HTML zines. One React 19/Vite interface ships as a zero-storage Cloudflare Workers web app, a packaged Electron desktop app, and native Capacitor projects for Android and iOS.

## Highlights

- **35mm Print-House Atelier UI**: Three living film stocks (**Riso Paper**, **Carbon Lab**, **Cyanotype**), drag-to-reorder filmstrips, 1-click offline **Sample Roll**, and zero external font/CDN dependencies.
- **Interactive Rituals**: Canvas chemical-wash **Darkroom Develop tray**, **3D Flip Prints** with back-of-print notes, clickable Pantone **Color DNA** pigment strips, and fullscreen **Cinema Mode** with a procedural Web Audio soundscape.
- **Print Lab Exports**: 1080×1350 Instagram/TikTok carousels, 4:5 **Contact Sheet Poster** (`.png`), local `MediaRecorder` **Cinema Story Reel** (`.webm`), standalone **Interactive HTML Zine** (with built-in 3D flip & Darkroom reveal), portable `.memoir` archive, and print/PDF.
- **Hosted Web (Cloudflare Workers Free Tier)**: Serves static assets via Workers Assets with zero-storage ephemeral vision + scrapbook story drafting via Cloudflare Workers AI (`@cf/meta/llama-4-scout-17b-16e-instruct`), protected by edge rate limiting (`worker/index.mjs`, `cloudflare.config.ts`). Your archive stays strictly in your browser’s IndexedDB.

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

For a signed sideload release, configure the four `MEMOIR_ANDROID_*` signing variables, then run:

```powershell
npm --prefix mobile run build:android:apk
npm --prefix mobile run smoke:android:release
```

The first command verifies and publishes the APK under `output/releases/android`; the second runs the same offline local-LLM acceptance against the non-debuggable signed artifact.

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
