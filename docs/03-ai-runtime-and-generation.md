# AI Runtime and Generation

## Runtime selection

- Browser development uses the local Node API and may call local Ollama. Grounded fallback remains available there.
- Packaged Electron uses the embedded local `llama.cpp` server and pinned desktop assets.
- Android and iOS use the native `MemoirRuntime` Capacitor plugin. They never fall back to HTTP.

Both compose and rewrite call `health()` and, when necessary, `prepare()` before inference. Preparation failures surface stable local errors.

## Mobile model and photo context

Both mobile platforms pin `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf` at 625,860,768 bytes and SHA-256 `1214AFEBFE07D894E550505E3DAB6E913953A3FB123EA425D7D7731962479FCA`.

The model is text-only in the v1 mobile architecture:

1. The renderer sanitizes and stages at most the first five selected images one at a time.
2. Android ML Kit or Apple Vision returns bounded, non-identifying labels locally.
3. Native code deletes staged bytes and passes only labels, asset order/roles, tone, notes, and music cue to llama.
4. Model output is parsed and schema/order validated before reaching the editor.

This is photo-aware local drafting, not direct image-embedding inference.

## Generation contracts

Compose returns `title`, `summary`, `quote`, ordered `sections`, and diagnostics. Every section must reference the corresponding selected asset id. Native generation uses a bounded job id and supports cancellation.

Rewrite accepts one bounded text field plus tone and returns `{ text }`. A first-action rewrite prepares the model just like compose.

Prompts treat user fields as quoted data and forbid invented names, dates, precise places, dialogue, or relationships. Raw model output is length-bounded, JSON-extracted, and validated.

## Model lifecycle

- Android copies and verifies the bundled asset into app-private storage. Nominally ready models are rehashed during `prepare()` so same-size corruption is repaired.
- iOS verifies the bundled app resource in place and unloads the engine on backgrounding or memory warnings.
- Both platforms reject devices below the supported RAM class.
- Cancellation is checked before Android model loading, after loading, and during token generation; iOS checks cancellation in its production engine.

## Evidence boundary

CI runs non-empty inference through the Android JNI engine on an emulator and the iOS production engine on a simulator. It also builds Android arm64 and unsigned iOS arm64 Release artifacts. Physical public-bridge generation, rewrite, cancellation, lifecycle, and performance evidence remains required by `docs/15-physical-device-acceptance.md`.
