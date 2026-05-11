# Mobile Runtime Strategy

Memoir is on-device first. Mobile runtime work must not depend on a hosted AI service for the v1 product promise.

## Android

- Build native inference with Android NDK.
- Package runtime libraries inside the AAB.
- Use Play Asset Delivery for the Qwen3.5 0.8B Q5 model files pinned in `../mobile/runtime-manifest.json`.
- Keep the base module below Play's practical 200 MB target.

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

The mobile target is `qwen35-0.8b-q5`, using `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf` and `mmproj-Qwen_Qwen3.5-0.8B-f16.gguf`. Platform delivery still differs: Android uses Play Asset Delivery, while iOS archive work is deferred until Mac/Xcode access exists.
