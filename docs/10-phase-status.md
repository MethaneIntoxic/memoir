# Memoir — Phase 0–9 Status Report
> Generated: 2026-04-26  
> Last updated: 2026-05-01

---

## ✅ Completed

### Phase 0 — Local Runtime
- [x] Node HTTP server (`server/server.mjs`) running on port 8787
- [x] Pluggable runtime abstraction layer (`server/runtime/index.mjs`)
- [x] Ollama runtime adapter (`server/runtime/ollama.mjs`) — used in dev mode
- [x] Embedded llama.cpp runtime adapter (`server/runtime/embedded-llama.mjs`)
- [x] Real llama.cpp Windows CPU binary extracted to `desktop/resources/llama/` (b8931)
- [x] Dev Ollama default remains `gemma4:e2b-instruct-q4_K_M`; packaged desktop default moved to `qwen3-vl-2b-instruct-q4_K_M` for the portable EXE size gate
- [x] Fuzzy model tag matching — Ollama tag resolution maps `gemma4:e2b` → configured instruct variant
- [x] `.ready` marker sealed — prevents partial-download activation
- [x] Bundled model manifest (`desktop/resources/memoir-default-model.json`) with SHA256 checksum and selected model-tier metadata
- [x] Embedded runtime proved working (`backend: embedded-llama`, `modelInstalled: true`)
- [x] Request timeout raised from 35 s to 60 s for both Ollama and embedded runtime
- [x] Embedded startup timeout raised from 10 s to 30 s
- [x] **mmproj vision projector** — integrated into manifest and embedded runtime via `--mmproj` flag

### Phase 1 — Memoir Schema
- [x] Memoir data model running in UI state
- [x] Create / edit / delete memoir entries

### Phase 2 — Image Import & Sanitization
- [x] Photo import (file picker + drag-drop)
- [x] Client-side image sanitization before sending to AI

### Phase 3 — AI Draft Generation
- [x] Staged jobs pipeline (`createGenerationJob`, `runGenerationPipeline`)
- [x] Grounding guard to prevent hallucination
- [x] Fallback / retry logic on inference failure
- [x] Live rewrite confirmed working end-to-end (`backend: ollama`, `reason: rewrite-live`)
- [x] **Full compose with real images** — vision analysis generated `"This photo captures a tranquil riverside scene at sunset."` from a real image; draft generated with `backend: ollama`, `reason: live-model`
- [x] **Embedded compose with real images** — vision analysis worked through embedded llama-server with mmproj; draft completed with grounding guard validation

### Phase 4 — Manual Editing
- [x] Rich text editing of AI-generated draft
- [x] Full CRUD on memoir body text

### Phase 5 — Archive Persistence
- [x] IndexedDB-first storage (`storage.ts`)
- [x] localStorage fallback + migration path
- [x] `clearArchiveStorage` lint-clean

### Phase 6 — HTML Export
- [x] Single-file HTML export with embedded styles

### Phase 7 — Print / PDF Path
- [x] Browser `window.print()` path with print stylesheet

### Phase 8 — Local Diagnostics
- [x] `/api/health` endpoint (model installed, backend, runtime, mmproj availability)
- [x] Diagnostics visible in UI
- [x] Health status shows the active local model in browser and packaged desktop modes

### Phase 9 — Test / Build Hooks
- [x] Server/runtime/dev/package smoke tests run through `npm test`
- [x] Client-side tests run through `npm run test:client`
- [x] `npm run smoke` = test + test:client + build + lint — fully green
- [x] `npm run smoke:packaged` validates the unpacked Windows distribution resource layout
- [x] `npm run build` produces production bundle
- [x] `npm run lint` zero warnings

### Desktop Shell Scaffold
- [x] Electron main process (`desktop/main.cjs`) — port-reuse safe
- [x] Electron preload bridge (`desktop/preload.cjs`) — exposes `window.memoirDesktop.apiBase`
- [x] `app/vite.config.ts` — `base: './'` for `file://` compatibility
- [x] `app/src/App.tsx` — reads desktop API base override
- [x] `npm run dev:desktop` — clean launch confirmed (exit 0)
- [x] **Desktop unpacked build** — `electron-builder --dir` produces `desktop/dist/win-unpacked/Memoir.exe` with selected resources (llama binaries, GGUF model, mmproj, server, built app)

### Hardening (completed this session)
- [x] **Model tag alignment** — dev Ollama and packaged embedded defaults are explicit per runtime
- [x] **Fuzzy Ollama tag resolution** — `requestModel` uses best-matching installed Ollama tag
- [x] **SHA256 verification** — embedded runtime verifies GGUF integrity on first boot
- [x] **`.gitignore` fixed** — malformed line separated; binary exclusions added
- [x] **Legacy `server/index.js` removed** — dead code eliminated
- [x] **Model manifest updated** — SHA256 populated, mmproj path added
- [x] **Request/startup timeouts increased** — 35 s → 60 s request, 10 s → 30 s startup
- [x] **mmproj integration** — embedded runtime now passes `--mmproj` to llama-server when projector is available
- [x] **End-to-end live verification** — full compose with real images confirmed working through both Ollama and embedded runtime paths
- [x] **Desktop Shell Fixes** — fixed an issue where the frontend was loading stale `localStorage` dev values instead of the packaged API base. `Memoir.exe` now consistently connects to its embedded AI.

---

## 🔲 Remaining (non-blocking)

| # | Task | Notes |
|---|------|-------|
| 1 | **Portable EXE release smoke** | The default model tier is now Qwen3-VL 2B Q4 for the one-file portable EXE path; final release still needs a clean-machine smoke and signing pass. |
| 2 | **macOS / Linux adapters** | Current embedded runtime is Windows-only. Cross-platform is out of scope for phase 9. |
| 3 | **Encrypted storage** | IndexedDB storage is plaintext. A known, documented limitation. |
| 4 | **Native Mobile App** | Current architecture is a responsive web app. A true native wrapper (Capacitor/React Native) would be required for iOS/Android app stores. |

---

## Definition of "Phase 9 Complete"

Phase 9 is **fully done** ✅:
1. `npm run smoke` green ✅
2. Full compose with real images through Ollama ✅ (`backend: ollama`, `reason: live-model`)
3. Full compose with real images through embedded llama-server ✅ (vision analysis working via mmproj)
4. Desktop build successfully creates a standalone distributable ZIP archive ✅
5. Health endpoint verified with correct model on both runtimes and UI successfully displays "Local AI ready" ✅
