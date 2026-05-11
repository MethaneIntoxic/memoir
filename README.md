# Memoir Prototype

Memoir is a browser-based prototype for turning 3 to 10 photos into an editable scrapbook-style draft using a local Node server and, when available, a live local model runtime.

The current repository is not a packaged mobile app and not a hardened private-by-default release. It is a local prototype that proves the flow from photo import to editable memoir draft, browser-local archive, HTML export, and print-to-PDF.

## Current Scope

- React and Vite browser client in `app/`.
- Local Node HTTP server in `server/server.mjs` with `GET /api/health`, `POST /api/generate`, `POST /api/generation-jobs`, and `GET /api/generation-jobs/:jobId`.
- Runtime abstraction in `server/runtime/` that supports the existing Ollama path and an embedded `llama.cpp`-style packaged runtime path.
- Optional live drafting and rewrite via local Ollama using `gemma4:e2b-instruct-q4_K_M` by default, plus a bundled desktop-model manifest targeting the smaller Qwen3-VL 2B single-file release tier.
- Grounded fallback draft and rewrite responses when Ollama is offline, missing the model, or returns unusable output.
- Browser-local archive stored in IndexedDB with migration from older `localStorage` keys.
- HTML export download and browser print flow for PDF saving.
- Desktop shell scaffold in `desktop/` for packaging the built app with a local bundled runtime.
- Shared release core in `packages/memoir-core` for schema validation, portable `.memoir` archives, deterministic HTML export, and platform artifact contracts.
- Capacitor mobile shell scaffold in `mobile/` for the first iOS and Android wrapper track.
- One shipped automated test covering the fallback draft contract in `tests/server-fallback.test.mjs`.

## What This Prototype Does Not Claim

- No encrypted storage at rest.
- No native iOS or Android packaging.
- No shipped bundled runtime binary or GGUF asset in the repository yet.
- No account system, sync, or cloud backup.
- No production support for mobile browsers.
- No release-grade privacy guarantees beyond the local machine and browser session you control.

## Local Run Guide

### Prerequisites

- A recent Node.js release that can run Vite 8 and the built-in `fetch` API. Current Node LTS is the safest choice.
- `npm`.
- Optional: Ollama installed locally if you want live model responses instead of fallback draft text.

### Install

The root package has only scripts. The actual web dependencies live under `app/`.

```bash
cd memoir/app
npm install
```

If you want the desktop shell scaffold, install its separate development dependencies:

```bash
cd memoir/desktop
npm install
```

### Start the prototype

Start the browser prototype from the repo root:

```bash
cd memoir
npm run dev:app
```

This command starts the local server when one is not already healthy on port `8787`, then starts Vite. Open the Vite URL shown in the terminal. The client proxies `/api` to `http://localhost:8787` during development, so the default Local AI URL in the UI can stay as `/api`.

For split-terminal debugging, `npm run dev:server` starts only the local API server and `npm run dev:vite` starts only Vite.

### Optional live AI setup

If Ollama is installed, pull the default model used by the prototype:

```bash
ollama pull gemma4:e2b-instruct-q4_K_M
```

The server will use these defaults unless you override them with environment variables:

- `MEMOIR_PORT=8787`
- `OLLAMA_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=gemma4:e2b-instruct-q4_K_M`

If Ollama is unavailable or the model is not installed, the UI still works and the server returns grounded fallback copy instead of a live model response.

### Desktop scaffold

The repository now includes a desktop shell scaffold under `desktop/`.

- `npm run dev:desktop` builds the renderer and launches the Electron shell.
- `npm run prepare:desktop-model` downloads and verifies the selected packaged model tier. Use `-- --tier qwen3vl-q3` only if the Q4 portable EXE fails the size gate.
- `npm run dist:desktop` builds the diagnostic Windows ZIP and unpacked smoke target.
- `npm run dist:desktop:single-file` builds the primary one-file Windows portable EXE at `desktop/dist/Memoir-0.1.0-portable.exe`.
- The desktop shell starts the local Memoir server automatically.
- In packaged mode, the server is prepared to prefer bundled embedded-runtime assets over Ollama.

The one-file Windows release uses the Qwen3-VL 2B Q4_K_M model plus the Q8 mmproj by default. The older Gemma bundle remains a future large/high-quality model pack candidate, not the default portable EXE payload.

## Current User Flow

1. Import 3 to 10 photos in the browser.
2. The browser re-encodes them to resized JPEG working copies before sending them to the local server.
3. Add an optional note and music cue.
4. Generate a draft memoir through the local server.
5. Edit title, summary, quote, captions, and body copy in the browser.
6. Save the memoir into the browser-local archive.
7. Export an HTML file or use the browser print dialog to save a PDF.

## Support Statement

Memoir currently supports local prototype use on a developer-controlled machine running the browser client and the local server together.

Supported for this prototype:

- Desktop-class Chromium browsers with the local server running on the same machine.
- LAN testing from another browser when the server is reachable and CORS/network settings are under your control.

Not supported as a release promise:

- Native mobile installs are scaffolded but not yet store-built.
- Offline packaged app distribution is smoke-tested locally through the portable EXE path but not yet signed release-ready.
- End-user desktop setup is available through the packaged app artifacts; mobile store artifacts still need native project generation and signing.
- Strong privacy or retention guarantees across browser resets, shared machines, or device compromise.

## Current Limitations

- Archive data is stored in browser IndexedDB, so clearing site data still removes saved memoirs.
- Imported photos are reduced and re-encoded for the prototype, but this is not a formal encrypted media vault or forensic-grade metadata pipeline.
- The server can fall back to template-like copy when Ollama is unavailable.
- The embedded-runtime desktop path depends on large local assets under `desktop/resources`; the single-file release must stay under the portable EXE size gate.
- The rewrite action is block-local only and does not maintain revision history.
- PDF output relies on the browser print path rather than a dedicated PDF renderer.
- Diagnostics shown in the UI are basic runtime labels, not a full support bundle.

## Document Map

- `docs/00-supreme-blueprint.md`: top-level truth statement for the current prototype and the phase 0 to 9 framing.
- `docs/01-product-spec.md`: current prototype goals, user flow, and non-goals.
- `docs/02-system-architecture.md`: implemented browser client, local server, data flow, and storage model.
- `docs/03-ai-runtime-and-generation.md`: Ollama integration, fallback behavior, and generation constraints.
- `docs/04-security-and-privacy.md`: current privacy boundary and what is not yet implemented.
- `docs/05-ux-content-and-editor.md`: current screens, editing affordances, and UX limits.
- `docs/06-platform-support-and-performance.md`: support statement and realistic prototype platform expectations.
- `docs/07-testing-and-release.md`: current validation depth and release framing.
- `docs/13-single-file-windows-portable-exe.md`: Windows portable EXE model tier, packaging, and smoke-gate plan.
- `docs/08-delivery-roadmap-and-backlog.md`: grounded interpretation of prototype phases 0 to 9 and the next work after them.
- `docs/09-risk-register.md`: current prototype risks and release blockers.
