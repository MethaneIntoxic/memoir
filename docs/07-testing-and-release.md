# Testing and Release

## Automated gates

Run from the repository root:

```powershell
npm run smoke
npm run release:readiness
```

`npm run smoke` covers repository contracts, client behavior, TypeScript/Vite production build, and lint. Native CI additionally provides:

- default arm64 Android debug APK build;
- final-APK package, permission, ABI, model, C++ runtime, and signature verification;
- bounded non-empty llama inference through the Android JNI engine on an x86_64 emulator;
- iOS Simulator build and bounded non-empty production-engine inference;
- unsigned arm64 iOS Release build with architecture and model checks.

Desktop release validation:

```powershell
npm run prepare:desktop-model
npm run dist:desktop:single-file
npm run smoke:desktop-single-file
npm run smoke:desktop-quality
```

## Browser/design QA

The current implementation was exercised at 390x844 and 1440x900 with Playwright. Archive, settings, export modal, keyboard dismissal, responsive navigation, and console cleanliness were checked. `design-qa.md` records the source and generated evidence paths.

## Physical Android gate

After connecting exactly one supported arm64 phone, enabling Airplane Mode, and disabling Wi-Fi:

```powershell
npm --prefix mobile run smoke:android:device
```

The runner validates device ABI/API/RAM/storage, builds and verifies the offline APK, installs it, confirms the installed permission set, runs real native inference instrumentation, and captures evidence under `output/android-device-acceptance`.

The full public Capacitor prepare/photo/generate/rewrite/cancel flow and signed Release rerun remain manual acceptance items until the dedicated device harness exists.

## Physical iOS gate

Use Xcode 26+ on macOS with a supported iPhone and Apple Developer signing. Build/run the Release configuration, then perform the exact offline flow and evidence capture in `docs/15-physical-device-acceptance.md`. Simulator success cannot satisfy this gate.

## Release labels

- Browser: developer/local prototype path.
- Windows: locally validated portable build; signing still required for public distribution.
- Android: build-ready and emulator-inference-proven, not physically validated or signed for distribution.
- iOS: simulator-inference and unsigned-arm64-build proven, not signed, physically validated, archived, or TestFlight-proven.

`release:readiness` reports source readiness separately from release readiness so source completeness cannot be mistaken for distribution approval.
