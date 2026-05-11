# Mobile Runtime Strategy

Memoir is on-device first. Mobile runtime work must not depend on a hosted AI service for the v1 product promise.

## Android

- Build native inference with Android NDK.
- Package runtime libraries inside the AAB.
- Use Play Asset Delivery for larger model files when the base module would become too large.
- Keep the base module below Play's practical 200 MB target.

## iOS

- Build the app with Xcode 26 / iOS 26 SDK or later for App Store submission.
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

The desktop GGUF is not the mobile default.
