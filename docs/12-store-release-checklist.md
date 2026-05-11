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
- [ ] Verify `desktop\dist\Memoir-0.1.0-portable.exe` exists and is below the configured single-file size gate.
- [ ] Launch the portable EXE on a clean Windows user profile without unzipping or installing.
- [ ] Confirm the local AI banner reports embedded runtime readiness.
- [ ] If Qwen3-VL Q4 fails the size gate or portable build, rerun model prep with `npm run prepare:desktop-model -- --tier qwen3vl-q3` and rebuild.
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
- [ ] Verify Play Asset Delivery strategy for model assets.
- [ ] Run internal testing install from Play Console.

## iOS

- [ ] Build on macOS with Xcode 26 or later.
- [ ] `npm run cap:add:ios`
- [ ] `npm run cap:sync`
- [ ] Archive and upload to App Store Connect/TestFlight.
- [ ] Confirm model assets are data assets and executable runtime is bundled.
- [ ] Complete privacy, encryption, and age-rating metadata.
