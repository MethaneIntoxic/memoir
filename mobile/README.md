# Memoir Mobile Shell

This folder is the Capacitor entry point for the first iOS and Android track.

The mobile shell reuses the Vite/React app from `../app/dist` and adds native bridges for storage, photo import, export, and local runtime access. It does not own memoir business rules; shared contracts live in `../packages/memoir-core`.

## Bootstrap

From this folder:

```powershell
npm install
npm run prepare:model
npm run cap:sync
npm run bootstrap:android -- -AcceptAndroidSdkLicenses
npm run build:android:debug
```

Review the Google Android SDK licenses before passing `-AcceptAndroidSdkLicenses`. The bootstrap script installs a repository-local Microsoft JDK 21, Android SDK platform 36, build-tools 35.0.0, CMake 3.22.1, and NDK 27.0.12077973; it does not silently accept licenses. iOS builds require macOS with Xcode 26 or later for App Store uploads.

## Release Artifacts

- Android sideload release: signed `.apk` at `android/app/build/outputs/apk/release/app-release.apk`.
- iOS store upload: Xcode archive uploaded to App Store Connect.
- Ad hoc iOS sharing may produce `.ipa`, but `.ipa` is not the primary App Store upload path.

## Runtime Rule

Do not copy arbitrary desktop GGUF files into the mobile shell. Mobile model assets are pinned by `runtime-manifest.json`; the v1 offline text-generation target is `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf`.

Android stages the model from generated APK assets into private app storage with size and SHA-256 verification. iOS bundles the same pinned model as a protected app resource and links the official llama.cpp XCFramework through Swift Package Manager. Run `npm run cap:sync` before opening either native project; the sync script reapplies the pinned iOS runtime package definition.

Both native bridges run CPU-only text generation on-device and expose the same fail-closed `MemoirRuntime` contract. Before generation, the shared renderer sends the first five sanitized photos one at a time to `stageAsset`. Android's bundled ML Kit labeler and Apple's Vision classifier reduce each photo to bounded, non-identifying labels on-device; raw photo bytes are never included in the llama.cpp generation request and staged context is cleared after generation or cancellation. This is photo-aware text generation, not a claim that the text model directly consumes image embeddings.
