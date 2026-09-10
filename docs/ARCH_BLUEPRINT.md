# Memoir Release Architecture Blueprint

## Status and scope

This document is the implementation contract for completing Memoir across the shared React UI, Electron desktop shell, Capacitor Android app, and Capacitor iOS app. It supersedes prototype-era claims that mobile is absent or that a regex contract test proves native inference works.

The existing iOS and Android projects are retained. Android and iOS use the same web UI and a platform-neutral runtime contract; platform code owns model delivery, verification, lifecycle, and inference.

## Validated stack

- Shared UI: React 19.2, TypeScript 6, Vite 8.
- Desktop: Electron 37 with the local Node server and embedded `llama.cpp` runtime.
- Mobile shell: Capacitor 8.3 with Java/JNI on Android and Swift plus an Apple `llama.cpp` XCFramework on iOS.
- Local model: `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf`, identified and hashed by `mobile/runtime-manifest.json` and fetched from immutable Hugging Face revision `6f447fc6494c4b0f7dc269f8c39da6c61555a0de`.
- Shared domain contracts: `packages/memoir-core` and the TypeScript validators in `app/src/memoir`.
- Verification: Node test runner, TypeScript build, ESLint, Gradle/Android device smoke, Xcode/iOS device smoke, and browser screenshot comparison.

Version-sensitive APIs must be checked against installed manifests/types and official Capacitor, Android, Apple, and `llama.cpp` documentation before use. Dependencies are pinned; release builds must not silently upgrade or execute unpinned source.

## Runtime contract

The renderer talks to one `LocalRuntimeAdapter`:

```ts
type RuntimePhase =
  | 'checking'
  | 'needs-prepare'
  | 'copying'
  | 'verifying'
  | 'loading'
  | 'ready'
  | 'unavailable'
  | 'failed'

type RuntimeHealth = {
  platform: 'web' | 'desktop' | 'android' | 'ios'
  runtime: string
  model: string
  phase: RuntimePhase
  available: boolean
  modelInstalled: boolean
  progressPct?: number
  reason?: string
}

interface LocalRuntimeAdapter {
  readonly kind: 'http' | 'native'
  health(): Promise<RuntimeHealth>
  prepare(): Promise<RuntimeHealth>
  stageAsset(input: { assetId: string; dataUrl: string }): Promise<void>
  clearStagedAssets(): Promise<void>
  generate(input: NativeComposeRequest): Promise<GenerateMemoirPayload>
  rewrite(input: NativeRewriteRequest): Promise<{ text: string }>
  cancel(jobId: string): Promise<void>
}
```

`NativeComposeRequest` carries ordered asset identifiers plus bounded narrative inputs. The renderer stages at most the first five sanitized photos sequentially, outside the generation payload. Platform classifiers reduce them to bounded labels locally, discard raw bytes, and feed only those labels plus ordered story roles to llama.cpp. This provides photo-aware drafting without claiming direct multimodal embeddings. `NativeRewriteRequest` carries one bounded text block, tone, and a native-generated or validated job id.

On Android and iOS, missing or unavailable native AI is a visible error. Mobile must never fall through to a configurable HTTP endpoint. Browser and Electron retain the local HTTP adapter.

## Model lifecycle

1. `health()` is cheap and never copies or hashes a model.
2. `prepare()` runs off the UI thread and reports copying, verifying, and loading phases.
3. Bundled assets are copied to an app-private temporary file, checked for expected byte size and SHA-256, flushed, and atomically renamed.
4. A mismatched or interrupted target is deleted and can self-heal on the next preparation.
5. Native responses expose stable error codes, never absolute filesystem paths or raw native exception strings.
6. Cancellation uses an atomic flag that inference can observe without waiting for the generation mutex.
7. Android unloads the model after every operation; iOS unloads on memory pressure/background lifecycle events.

`mobile/runtime-manifest.json` is the source of truth for model name, hashes, sizes, context, token cap, memory class, and delivery mode. Generated Android and iOS metadata must be derived from it.

## Platform implementation

### Android

- `MemoirRuntime` is a registered Capacitor plugin with `health`, `prepare`, `stageAsset`, `clearStagedAssets`, `generateMemoir`, `rewrite`, and `cancelGeneration`.
- JNI calls a CPU-only shared `llama.cpp` engine on a single inference executor.
- JNI reserves two CPU cores, caps inference at four threads, uses a 1,024-2,048-token context and 512-token prompt batches, and unloads the model after each operation.
- Production watchdogs cancel compose after 120 seconds and rewrite after 60 seconds; severe thermal state is checked before work and every five seconds during inference.
- ARM64 enables release-grade optimization and KleidiAI kernels. x86 exists only for CI contract evidence and is never a performance target.
- Bundled ML Kit image labeling creates bounded photo context without a network model download; raw staging files and labels are cleared on completion, cancellation, load, and destruction.
- The direct-install APK contains the pinned model. Unused projector assets are excluded until multimodal inference is implemented.
- Generated model assets are synchronized as an exact one-file allowlist so stale build outputs cannot re-enter the APK.
- The JNI library links one consistent static Android libc++ runtime; the APK must not depend on or package `libc++_shared.so`.
- App backup is disabled or explicitly excludes WebView memoir data, model files, and media.
- FileProvider exposes only an app-private `exports/` directory.
- Social carousel export shares a bounded, PNG-only ordered file set through the Android system Sharesheet using the multi-image intent documented by Android and TikTok. It does not embed Instagram or TikTok SDK credentials.
- Debug builds are the development install target. Release artifacts require signing credentials and signature verification.

### iOS

- Extend `mobile/ios/App`; do not create a second product or a separate UI.
- `MemoirRuntimePlugin` implements the same Capacitor methods and stable payloads as Android.
- Link a checksum-pinned official `llama.cpp` iOS XCFramework compatible with the selected model.
- Apple Vision classifies the first five ordered photos entirely on-device; only bounded labels survive long enough to build the prompt.
- Model data is bundled or delivered as reviewed data assets, copied/verified only when direct bundle memory mapping is not suitable.
- Memoir data and staged model files use complete file protection where compatible; model files are excluded from iCloud backup.
- Runtime lifecycle responds to memory warnings, thermal pressure, backgrounding, and cancellation.

### Native inference smoke architecture

- CI must execute at least one bounded, schema-valid memoir generation through each production engine. A successful compile, model hash, library load, or arbitrary token is not a substitute for inference.
- Android production and ordinary debug builds remain `arm64-v8a` only. The Gradle build accepts `x86_64` solely through an explicit, allowlisted smoke-test property, and the emulator test calls the same JNI entry point and bundled GGUF as the Capacitor plugin.
- JNI batches must not retain pointers to loop-scoped token storage. The sampled token backing each one-token decode remains alive until the following decode completes.
- The iOS smoke hook is compiled only when CI adds `MEMOIR_CI_INFERENCE_SMOKE`; normal Debug and every Release build omit it. It runs the production `MemoirRuntimeEngine` off the launch thread against the bundled model.
- Smoke jobs emit only stable success/failure sentinels, token/output counts, JSON-completion state, and elapsed time. Generated memoir text, prompts containing user data, filesystem paths, and native exception details are never logged.
- Every smoke has a bounded process timeout and fails unless generation returns a non-empty result. Emulator/simulator evidence complements but does not replace the physical-device release gates below.

### Desktop and browser

- Electron remains local-only and uses its injected API base.
- Browser development may use the configurable local server.
- Production desktop shows the actual active backend/model and never labels template fallback as live inference.

## UI contract

The seven screens under `wireframes/` remain the structural source of truth. The current visual system uses warm paper white, near-black ink, editorial serif headings, sage status accents, restrained blush selection states, cards no rounder than 8px, and soft hierarchy shadows. It favors candid keepsake content and direct creation over decorative panels or gender stereotypes.

Required routes and states:

- Archive: empty, loading, populated, import failure, destructive-clear confirmation.
- Photo selection: persistent add/remove/reorder for 3 to 10 photos with visible order.
- Compose: tone/notes/music, runtime preparation progress, generate/cancel/retry.
- Layout studio: editable generated story, reorder, rewrite, regenerate, publish.
- Reader: long-form scrapbook layout with chapter position and previous/next controls.
- Share/export: explicit modal with busy, success, error, and platform share paths.
- Settings/profile: local-model diagnostics, storage/privacy, appearance, and export controls. No fake account or cloud features.

Mobile supports 320, 390, 430, and 448 px widths, safe-area insets, fixed reachable navigation, 44 px minimum targets, visible focus, and status announcements. Desktop uses a 960 to 1200 px responsive content region with archive grids, a compose work area plus summary, and a readable editorial canvas.

Reader chapters use a horizontal snap carousel at every supported width. Social export renders one deterministic 1080 x 1350 PNG per chapter; mobile shares the ordered images directly through the platform sheet and desktop downloads a ZIP. Target-app posting remains user-confirmed so no social account token or private media is handed to an embedded third-party SDK.

## Data and privacy constraints

- Mobile network AI is fail-closed. A future LAN developer endpoint requires an explicit developer toggle and destination allowlist.
- Native bridge inputs enforce asset count, byte/string length, token, enum, and identifier limits before inference.
- Capacitor bridge logging is disabled in every build because method payloads may contain staged photo data URLs or memoir text.
- Notes and music cues are data, not executable instructions. Model output is schema-validated and may not select paths, URLs, native actions, or share destinations.
- Imported images have source byte and decoded-pixel caps and are re-encoded before persistence or inference.
- `.memoir` import enforces archive, entry, asset-count, MIME, pixel, and string limits; image magic bytes must match the allowed MIME type.
- Exported HTML escapes attribute values and preview runs in a sandboxed document with a restrictive CSP.
- Mobile backups do not contain memoir media or model copies unless the product explicitly adds an opt-in encrypted backup feature.
- Destructive navigation and archive clearing require explicit confirmation when user work would be lost.

## Directory map

```text
app/src/platform/
  runtime-adapter.ts       shared adapter selection and contracts
app/src/memoir/
  generation.ts            adapter-driven compose orchestration
  ui/                      wireframe-driven screens and states
mobile/android/app/src/main/
  java/.../MemoirRuntimePlugin.java
  cpp/                     JNI wrapper and runtime engine
mobile/ios/App/App/
  MemoirBridgeViewController.swift
  PrivacyInfo.xcprivacy
mobile/ios/App/CapApp-SPM/Sources/CapApp-SPM/
  MemoirRuntimePlugin.swift
  MemoirRuntimeEngine.swift
mobile/runtime-manifest.json
native/
  BRIDGE_CONTRACTS.md
  MOBILE_RUNTIME.md
tests/
  mobile-runtime-contract.test.mjs
  ui-layout-contract.test.mjs
design-qa.md
```

## Verification gates

The implementation is not complete until all applicable gates pass:

1. `npm test`, `npm run test:client`, `npm run build`, and `npm run lint`.
2. Android debug build and unit tests; install on an arm64 device; `prepare()` completes; one short generation and rewrite complete offline; cancellation returns promptly; airplane-mode use makes no network request.
3. Signed Android release verification before calling an APK distributable.
4. Xcode build/test on macOS and one physical iPhone generation/rewrite smoke before claiming iOS on-device support.
5. Browser visual QA at 390x844 and 1440x900 against the matching wireframes; primary navigation, compose, reader, share, and settings interactions tested; no console errors.
6. `design-qa.md` records source paths, implementation screenshots, comparison history, remaining P3 polish, and `final result: passed`.

Hardware-only checks may be reported as unverified when the required host/device is unavailable, but the app must not be described as mobile-release-ready until those checks exist.
