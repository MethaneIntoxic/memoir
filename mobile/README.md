# Memoir Mobile Shell

This folder is the Capacitor entry point for the first iOS and Android track.

The mobile shell reuses the Vite/React app from `../app/dist` and adds native bridges for storage, photo import, export, and local runtime access. It does not own memoir business rules; shared contracts live in `../packages/memoir-core`.

## Bootstrap

From this folder:

```powershell
npm install
npm run build:web
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
```

Android builds require Android Studio/Gradle. iOS builds require macOS with Xcode 26 or later for App Store uploads.

## Release Artifacts

- Android store upload: signed `.aab`.
- iOS store upload: Xcode archive uploaded to App Store Connect.
- Ad hoc iOS sharing may produce `.ipa`, but `.ipa` is not the primary App Store upload path.

## Runtime Rule

Do not copy arbitrary desktop GGUF files into the mobile shell by default. Mobile model assets are pinned by `runtime-manifest.json`; the v1 offline target is `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf` plus `mmproj-Qwen_Qwen3.5-0.8B-f16.gguf`.

Android is the first build path and should use Play Asset Delivery for the model payload. iOS source/config can be generated through Capacitor, but final archive and upload are deferred until macOS with Xcode 26 or later is available.
