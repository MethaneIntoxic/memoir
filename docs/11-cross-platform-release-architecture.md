# Cross-Platform Release Architecture

- React/Vite owns the shared user interface.
- `packages/memoir-core` owns schemas, deterministic HTML, portable `.memoir` archives, slide export, release artifact metadata, and bridge names.
- Electron owns the Windows window/process boundary and embedded local server/runtime.
- Capacitor owns the Android and iOS WebView shells.
- Native platform code owns local inference, photo classification, app-private model handling, lifecycle, and eventual native file/share integration.

## Artifacts

- Windows primary: `desktop/dist/Memoir-0.1.0-portable.exe` from `npm run dist:desktop:single-file`.
- Android development: arm64 debug APK verified by `mobile/scripts/verify-android-apk.mjs`.
- Android distribution: signed arm64 Release APK; unsigned or debug APKs are not public release artifacts.
- iOS preflight: unsigned arm64 Release app built for generic iOS.
- iOS distribution: signed Xcode archive uploaded to App Store Connect; an ad hoc `.ipa` is not the primary store artifact.

## Portable memoir

The `.memoir` ZIP contains `manifest.json`, `memoir.json`, diagnostics/export metadata, deterministic HTML, and sanitized assets. Import enforces entry, path, MIME, size, pixel, string, and schema limits. It is portable backup/transfer data, not encrypted storage.

## Runtime assets

Android and iOS use `mobile/runtime-manifest.json`. Android copies the exact model into the APK and then app-private storage. iOS bundles the same model as a protected app resource. Executable runtime code is shipped with the reviewed app.

## Readiness model

Source readiness means projects, contracts, tests, and unsigned builds exist. Release readiness additionally requires fresh signed artifacts, physical-device acceptance, platform privacy/compliance metadata, and distribution-channel validation. `npm run release:readiness` reports these separately.
