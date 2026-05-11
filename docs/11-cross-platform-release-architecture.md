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

- Web: `dist/web/memoir-web.zip` from `npm run package:web`.
- Windows: `npm run dist:desktop:single-file` for the primary one-file portable EXE.
- Windows diagnostic: `npm run dist:desktop` for a ZIP plus `win-unpacked` staging target.
- Windows single-file model tier: Qwen3-VL 2B Q4_K_M plus the Q8 mmproj is the default portable payload. The older Gemma bundle is treated as a future large/high-quality model pack, not the default one-file release tier.
- Android: signed `.aab` from the Capacitor Android project.
- iOS: Xcode archive uploaded to App Store Connect; `.ipa` only for ad hoc/internal distribution.

## Store Policy Notes

- iOS must not download executable code that changes app functionality after review.
- Android store upload uses an `.aab`; Google Play generates optimized APKs.
- Mobile model assets are separate from desktop model assets.
