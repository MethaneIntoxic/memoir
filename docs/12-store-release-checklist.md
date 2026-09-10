# Store and Distribution Checklist

## Shared

- [ ] `npm run smoke`
- [ ] `npm run release:readiness` and confirm `releaseReady: true`
- [ ] `.memoir` import/export round trip passes with representative archives.
- [ ] Diagnostics contain no raw images, prompts, generated text, paths, or secrets beyond the documented support fields.
- [ ] Privacy policy, deletion language, third-party notices, age rating, and export-compliance determination are complete.

## Windows

- [ ] `npm run prepare:desktop-model`
- [ ] `npm run dist:desktop:single-file`
- [ ] `npm run smoke:desktop-single-file`
- [ ] `npm run smoke:desktop-quality`
- [ ] Portable EXE is below 2.5 GB and built from the intended commit.
- [ ] Clean-profile launch and local generation pass.
- [ ] Artifact is code-signed before public distribution.

## Android

- [ ] `npm install --prefix mobile`
- [ ] `npm --prefix mobile run prepare:model`
- [ ] `npm --prefix mobile run bootstrap:android -- -AcceptAndroidSdkLicenses`
- [ ] `npm --prefix mobile run build:android:debug`
- [ ] `npm --prefix mobile run verify:android:debug`
- [ ] `npm --prefix mobile run smoke:android:device` passes on the lowest supported phone in Airplane Mode.
- [ ] Public prepare, three-photo staging/generation, first-action rewrite, active cancellation/recovery, archive relaunch, and export/share pass.
- [ ] Configure `MEMOIR_ANDROID_KEYSTORE`, `MEMOIR_ANDROID_KEYSTORE_PASSWORD`, `MEMOIR_ANDROID_KEY_ALIAS`, and `MEMOIR_ANDROID_KEY_PASSWORD`.
- [ ] `npm --prefix mobile run build:android:apk` produces a signed Release APK.
- [ ] `npm --prefix mobile run smoke:android:release` passes the same complete offline suite against that signed Release artifact.
- [ ] Record signature certificate, SHA-256, size, ABI, model allowlist, permission set, commit, device matrix, latency, memory, and thermals.

## iOS

- [ ] On macOS: `npm ci --prefix app`, `npm ci --prefix mobile`, `npm --prefix mobile run prepare:model`, and `npm --prefix mobile run cap:sync`.
- [ ] Unsigned generic-iOS Release build succeeds and both the app/runtime contain arm64.
- [ ] Use Xcode 26+ and an Apple Developer team for signed device/archive work.
- [ ] Complete the signed physical-iPhone flow in `docs/15-physical-device-acceptance.md` on the lowest supported device.
- [ ] Archive with destination `generic/platform=iOS`; verify code signature, entitlements, arm64 binaries, exact model size/hash, and generated privacy report.
- [ ] Complete privacy nutrition labels, encryption/export compliance, age rating, screenshots, support/privacy URLs, and regional requirements.
- [ ] Upload to App Store Connect/TestFlight and rerun offline acceptance on the processed TestFlight build.
