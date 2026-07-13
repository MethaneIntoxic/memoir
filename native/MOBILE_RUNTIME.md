# Mobile Runtime Strategy

Memoir’s mobile AI is offline and fail-closed. Android and iOS use the same renderer contract, the same pinned text model, and platform-native photo classification. Neither platform may redirect memoir data to HTTP when native inference is unavailable.

## Shared model

`mobile/runtime-manifest.json` pins:

- `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf`
- 625,860,768 bytes
- SHA-256 `1214AFEBFE07D894E550505E3DAB6E913953A3FB123EA425D7D7731962479FCA`
- 4,096-token context target
- 8 GB RAM-class minimum

`npm --prefix mobile run prepare:model` verifies that the Android and iOS manifest entries identify the same asset before reusing the shared local model file.

## Android

- Gradle builds a pinned `llama.cpp` revision through NDK 27 and packages `libmemoirllama.so` for `arm64-v8a` by default.
- The APK contains exactly one GGUF model. The old projector asset is not packaged because v1 uses bounded on-device labels rather than direct visual embeddings.
- `prepare()` checks device memory and free app storage, copies the model to app-private storage, verifies its size and SHA-256, flushes it, and activates it atomically.
- A subsequent `prepare()` rehashes the active model, so same-size corruption is replaced rather than trusted.
- Bundled ML Kit labels at most the first five sanitized photos. Only bounded labels enter the text prompt.
- Manifest merger rules remove transitive `INTERNET` and `ACCESS_NETWORK_STATE` permissions. `verify-android-apk.mjs` checks the final APK.

## iOS

- The committed Capacitor/Xcode project links the checksum-pinned official `llama.cpp` XCFramework through Swift Package Manager.
- The exact model is an app resource and `prepare()` verifies its full SHA-256 before use.
- Apple Vision classifies at most the first five photos on-device; raw photo data does not enter the text-model prompt.
- The plugin unloads the model on backgrounding and memory warnings and clears staged photo state.
- The app requires arm64 and fails with `native-ai-unsupported-memory` below the supported RAM class.

## Evidence boundary

CI proves Android x86_64 emulator inference, Android arm64 packaging, iOS simulator inference, and an unsigned arm64 iOS Release build. These complement but do not replace the signed physical-device gates in `docs/15-physical-device-acceptance.md`.
