# Memoir Prototype Blueprint

## Current Truth

Memoir is currently a browser client plus a local Node server. It is a working prototype, not a packaged mobile product and not a hardened privacy release.

The implemented flow proves these ideas today:

- import a small photo set in the browser,
- draft memoir copy through a local API,
- edit the result inline,
- save it into a browser-local archive,
- and export it as HTML or through the browser print dialog.

Everything in this doc set should be read through that lens. If a capability is not visible in the browser UI, `server/server.mjs`, or the current test path, it is not implemented yet.

## Implemented Contract

### What exists now

- React and Vite browser UI in `app/`.
- Local Node HTTP server in `server/server.mjs`.
- Ollama-backed draft generation when a local model is available.
- Grounded fallback draft and rewrite behavior when the model path is unavailable.
- Browser-local archive saved in IndexedDB, with migration from older `localStorage` keys.
- HTML export download and browser print to PDF.
- Basic runtime diagnostics surfaced in the UI.
- Windows portable packaging with an embedded Qwen3.5 0.8B Q5_K_M local model tier.

### What does not exist yet

- encrypted storage at rest,
- shipped native mobile packaging,
- a secure media vault,
- durable background job recovery,
- schema migrations or document revision history,
- release-grade diagnostics,
- or a validated mobile support matrix.

## Honest Boundaries

Memoir can truthfully claim the following about the current prototype:

- the repo does not call a hosted memoir API,
- the browser sends data to a configurable local HTTP endpoint,
- Ollama is the only live model runtime wired by default,
- and the app still works when Ollama is offline because the server returns fallback copy.

Memoir cannot truthfully claim the following yet:

- encrypted local persistence,
- native iPhone or Android readiness,
- release-quality deletion semantics,
- end-user-safe support on arbitrary phones,
- or production-grade privacy guarantees after export or browser reset.

## Prototype System Shape

### Browser client

The browser client handles photo selection, image resizing and re-encoding, form inputs, draft editing, archive persistence, and export actions.

### Local server

The local server exposes `GET /api/health`, `POST /api/generate`, `POST /api/generation-jobs`, and `GET /api/generation-jobs/:jobId`, checks Ollama availability, runs a staged generation flow when possible, and falls back to grounded copy when needed. Compose generation first builds a compact story map for the ordered photo set, then drafts one section per photo from that map.

### Storage

Saved memoirs live in browser IndexedDB. Exported files live wherever the user saves them. There is no encrypted store and no backup service.

## Phase 0 to 9 Framing

The app sidebar already shows phases `0` through `9`. In the current repo, those numbers are prototype maturity markers, not shipping gates.

### What the phase labels mean today

- `0`: local runtime path chosen with Node server plus Ollama or fallback.
- `1`: memoir data shape lives in UI state.
- `2`: browser photo sanitization and resize flow is active.
- `3`: draft generation and rewrite requests are active.
- `4`: manual editing is active.
- `5`: archive persistence is active.
- `6`: HTML export is active.
- `7`: printable PDF path is active through browser print.
- `8`: local diagnostics are visible.
- `9`: build and test hooks exist.

### What phase 9 does not mean

- It does not mean release ready.
- It does not mean encrypted.
- It does not mean mobile packaged.
- It does not mean device support is validated.
- It does not mean the current export path is final.

## Current Definition of Success

For this prototype, success means:

1. The browser can turn 3 to 10 photos into a visible draft.
2. The draft remains editable before export.
3. The app still behaves coherently when Ollama is unavailable.
4. The user can save and reopen a memoir in the same browser.
5. The user can take an exportable artifact out of the flow.

## Before This Can Be Framed as a Release

The next threshold is not more visual polish. The next threshold is credibility.

That requires at least:

- encrypted or cross-browser durable storage beyond browser IndexedDB,
- documented deletion behavior,
- a stronger privacy boundary,
- broader automated coverage,
- a dedicated PDF/export pipeline,
- and a support statement tied to tested environments rather than aspiration.
