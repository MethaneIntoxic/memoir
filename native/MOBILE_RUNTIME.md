# Mobile Runtime Strategy

Memoir is on-device first. Mobile runtime work must not depend on a hosted AI service for the v1 product promise.

## Android

- Build native inference with Android NDK and a pinned llama.cpp checkout generated during the Gradle build.
- Package the `memoirllama` JNI runtime library inside the APK.
- Copy the Qwen3.5 0.8B Q5 model files pinned in `../mobile/runtime-manifest.json` into generated Android APK assets from `desktop/resources/models`.
- Do not commit GGUF model assets; the Gradle build validates local presence and copies them during `preBuild`.
- Android v1 uses text-only llama.cpp drafting from the ordered asset ids, tone, notes, and music cue. The f16 projector remains packaged and verified, but native multimodal image embedding is a later pass.

## iOS

- Keep Capacitor iOS source ready, but defer the final archive until macOS with Xcode 26 / iOS 26 SDK or later is available.
- Bundle executable inference code in the app; do not download executable code after review.
- Treat model weights as data assets.
- Use app-bundled assets or Apple-hosted/background assets after review of size and policy impact.

## Shared Model Manifest

Each platform runtime needs a manifest with:

- model id,
- runtime id,
- quantization,
- expected file name,
- expected checksum,
- context size,
- minimum memory class,
- delivery mode: bundled, install-time asset, fast-follow asset, or developer-only.

The mobile target is `qwen35-0.8b-q5`, using `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf` and `mmproj-Qwen_Qwen3.5-0.8B-f16.gguf`. Platform delivery still differs: Android uses direct APK assets, while iOS archive work is deferred until Mac/Xcode access exists.
