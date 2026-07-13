# Test Map

Root `npm test` covers server fallback/JSON/context behavior, portable schema/export contracts, development startup, packaged desktop resources, UI/native bridge contracts, and release-readiness structure.

`npm run test:client` covers image sanitation, document editing, export purity, generation job behavior, native staging/order, native cancellation routing, model preparation before compose/rewrite, and validation.

Native workflow evidence adds:

- arm64 Android APK compilation and final-package inspection;
- x86_64 Android emulator llama inference through the JNI engine;
- iOS Simulator llama inference through the production engine;
- unsigned arm64 iOS Release compilation and resource checks.

Physical-device acceptance is deliberately separate. Run and retain the evidence described in `docs/15-physical-device-acceptance.md` before changing mobile release status.
