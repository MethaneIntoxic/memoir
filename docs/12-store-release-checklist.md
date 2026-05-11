# Store Release Checklist

## Shared

- [ ] `npm test`
- [ ] `npm --prefix app run test`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run package:web`
- [ ] `npm run release:readiness`
- [ ] Verify `.memoir` import/export round trip.
- [ ] Verify diagnostics contain no raw image data.
- [ ] Publish privacy policy and data deletion language.

## Windows

- [ ] `npm run prepare:desktop-model`
- [ ] `npm run dist:desktop:single-file`
- [ ] `npm run smoke:desktop-single-file`
- [ ] `npm run smoke:desktop-quality`
- [ ] Verify `desktop\dist\Memoir-0.1.0-portable.exe` exists and is below the 2.5 GB hard shipping gate.
- [ ] Launch the portable EXE on a clean Windows user profile without unzipping or installing.
- [ ] Confirm the local AI banner reports embedded runtime readiness.
- [ ] Confirm the manifest tier is `qwen35-0.8b-q5`; use `qwen3vl-q4` or `qwen3vl-q3` only for larger fallback build experiments.
- [ ] `npm run dist:desktop` for diagnostic ZIP/unpacked validation when needed.
- [ ] Run packaged resource smoke.
- [ ] Run desktop release smoke.
- [ ] Keep ZIP publishing as a recovery artifact, not the primary user-facing release.
- [ ] Sign release artifact before public distribution.

## Android

- [ ] Install mobile dependencies in `mobile/`.
- [ ] `npm run cap:add:android`
- [ ] `npm run cap:sync`
- [ ] Build signed release `.aab` in Android Studio/Gradle.
- [ ] Verify Play Asset Delivery strategy for model assets from `mobile/runtime-manifest.json`.
- [ ] Run internal testing install from Play Console.

## iOS

- [ ] `npm run cap:add:ios`
- [ ] `npm run cap:sync`
- [ ] Defer archive/upload until macOS with Xcode 26 or later is available.
- [ ] Confirm model assets are data assets and executable runtime is bundled.
- [ ] Complete privacy, encryption, and age-rating metadata.
