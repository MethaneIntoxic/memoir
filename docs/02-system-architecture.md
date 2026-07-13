# System Architecture

## Shared product layer

- `app/src/App.tsx` coordinates archive, compose, reader, editor, settings, runtime status, and export flows.
- `app/src/memoir/` owns sanitization, generation orchestration, document editing, persistence, validation, and export rendering.
- `app/src/platform/` selects local HTTP versus native runtime and browser download versus native share behavior.
- `packages/memoir-core` owns the versioned memoir schema, portable archive, deterministic HTML, slides, and platform contracts.

## Delivery shells

### Browser development

`server/server.mjs` serves the local API and may use local Ollama. It provides grounded fallback drafting when the development model path is unavailable.

### Windows desktop

Electron starts the local server inside the packaged process boundary and prefers the embedded llama runtime/model manifest. The portable artifact bundles the renderer, runtime, and verified model assets.

### Android

Capacitor hosts the shared renderer. `MemoirRuntimePlugin` owns app-private model staging, ML Kit photo labels, JNI inference, cancellation, and health/preparation state. `MemoirFilesPlugin` writes bounded app-private exports and opens the Android share sheet.

### iOS

Capacitor hosts the shared renderer. `MemoirRuntimePlugin` owns model verification, Vision labels, Swift llama inference, cancellation, and lifecycle unload. `MemoirFilesPlugin` writes protected temporary exports and opens `UIActivityViewController`.

## Data flow

1. The renderer sanitizes and orders 3 to 10 images.
2. Browser/Electron sends the bounded request to the local API; mobile stages up to five images into the native classifier bridge.
3. Local analysis produces a compact ordered story context.
4. The selected local runtime returns schema-shaped memoir JSON.
5. The renderer validates exact section/asset order and opens the editable reader/editor.
6. Explicit save writes the memoir and sanitized image data to IndexedDB.
7. Export renders the current edited state into portable, HTML, slide ZIP, diagnostic, or print-oriented output.

## Persistence and schemas

Memoir data includes ids/timestamps, title/summary/quote, tone/theme, notes/music cue, sanitized assets, ordered sections, and diagnostics. The versioned validators live in `packages/memoir-core` and `app/src/memoir/validation.ts`.

The active archive is IndexedDB in the browser/WebView profile. There is no account, server database, cloud sync, or encrypted vault. Portable `.memoir` files provide explicit transfer/backup.

## Verification surface

Root tests cover server, schema, renderer, UI, native contract, export, and packaging behavior. Native CI builds Android/iOS artifacts and executes bounded production-engine inference on emulator/simulator. Desktop smokes execute the packaged embedded model. Physical mobile gates are defined separately.
