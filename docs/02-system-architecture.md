# Implemented System Architecture

## Active Runtime Path

The current runtime path is simple and explicit:

- `app/src/App.tsx` holds the client-side flow.
- `server/server.mjs` is the default local API started by the root scripts.
- `tests/server-fallback.test.mjs` is the one shipped automated validation path.

There are other folders in the repo for future work, but the prototype behavior today is driven almost entirely by those files.

## Major Pieces

### Browser client

The browser client is responsible for:

- photo import,
- image resizing and JPEG re-encoding,
- input state for tone, note, music cue, and API URL,
- editable memoir state,
- browser archive persistence,
- and export actions.

### Local server

The local server is responsible for:

- reporting Ollama health,
- generating a memoir draft,
- rewriting a single caption or paragraph,
- normalizing model output,
- and falling back to grounded template copy when the live model path fails.

### Test surface

The current automated test checks that fallback draft generation behaves predictably and that grounding guards push unsafe model output back to the fallback path.

## Current Data Model

The client keeps a lightweight memoir object in browser state and persists saved memoirs into IndexedDB.

### Asset shape

- `id`
- `name`
- `dataUrl`
- `width`
- `height`

### Section shape

- `id`
- `assetId`
- `caption`
- `body`

### Memoir shape

- `id`
- `createdAt`
- `updatedAt`
- `title`
- `summary`
- `quote`
- `tone`
- `theme`
- `notes`
- `musicCue`
- `assets`
- `sections`
- `diagnostics`

This is UI-managed data, not a shared versioned schema package.

## Current Data Flow

1. The user selects image files in the browser.
2. The client draws each image to a canvas, rescales it, and re-encodes it to JPEG.
3. The client starts a generation job with `POST /api/generation-jobs` and polls `GET /api/generation-jobs/:jobId`.
4. The server either runs staged Ollama analysis plus drafting or returns fallback draft content.
5. The client places the returned draft into editable React state.
6. The user edits and optionally rewrites individual sections.
7. The client saves the current memoir into browser IndexedDB.
8. The export actions render the current memoir into HTML or open the print flow.

## Storage Model

### What is persisted

- memoir text,
- working image data URLs,
- timestamps,
- and runtime diagnostics associated with each saved memoir.

### Where it is persisted

- browser IndexedDB for saved memoirs, with legacy migration from `localStorage` keys.

### What is not present

- database layer,
- encrypted media vault,
- migration system,
- or server-side persistence.

## Current API Surface

### `GET /api/health`

Returns whether Ollama is reachable, which model is expected, and whether that model is installed.

### `POST /api/generation-jobs`

Starts a staged compose generation job for memoir drafting.

### `GET /api/generation-jobs/:jobId`

Returns the current generation job state, stage progress, and final draft result when complete.

### `POST /api/generate`

Handles two modes:

- draft generation when no mode is supplied,
- block rewrite when `mode` is `rewrite-block`.

## Important Architectural Limits

- There is no background job system.
- There is no resume-after-refresh flow.
- There is no multi-user or account boundary.
- The browser client directly owns most state and rendering logic.
- `server/index.js` exists in the repo, but the default run path is `server/server.mjs`.