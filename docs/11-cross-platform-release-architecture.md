# Cross-Platform Release Architecture

Memoir now has a shared release direction:

- React/Vite remains the shared UI shell.
- `packages/memoir-core` owns schema, export rendering, portable `.memoir` archives, release artifact contracts, and bridge names.
- Electron remains the Windows desktop shell.
- Capacitor is the first iOS/Android shell.
- Native iOS/Android layers own storage, photo import, sharing, export, and local runtime bridges.

## Portable Memoir File

The `.memoir` file is a ZIP archive with:

- `manifest.json`,
- `memoir.json`,
- `diagnostics.json`,
- `export.json`,
- `exports/memoir.html`,
- and sanitized image assets under `assets/`.

The archive is intended for app-to-app transfer, backup, and future hosted import. It is not encrypted yet.

## Release Artifacts

- Windows: `npm run dist:desktop:single-file` for the primary one-file portable EXE.
- Windows diagnostic: `npm run dist:desktop` for a ZIP plus `win-unpacked` staging target.
- Windows single-file model tier: Qwen3.5 0.8B Q5_K_M plus the f16 mmproj is the default portable payload. The 2.5 GB hard shipping gate applies to the portable EXE; Qwen3-VL tiers remain optional larger fallback builds.
- Android: signed direct-install `.apk` from the Capacitor Android project, with Qwen model assets copied from local desktop model resources at build time.
- iOS: source/config stay ready for Capacitor, but final Xcode archive is deferred until macOS/Xcode access exists; `.ipa` is only for ad hoc/internal distribution.

## Store Policy Notes

- iOS must not download executable code that changes app functionality after review.
- Android v1 uses a direct sideload `.apk`; users may need to allow installs from outside the Play Store.
- Mobile model assets use `mobile/runtime-manifest.json`; Android direct APK builds use generated APK assets and iOS archive work is deferred.
