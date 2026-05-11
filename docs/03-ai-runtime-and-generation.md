# AI Runtime and Generation: Current Prototype

## Runtime Shape

The current AI path is a local HTTP server, not an in-browser model runtime and not a native mobile runtime.

`server/server.mjs` uses these defaults:

- port `8787`,
- `OLLAMA_URL=http://127.0.0.1:11434`,
- `OLLAMA_MODEL=gemma4:e2b-instruct-q4_K_M`.

The browser checks `GET /api/health` and shows whether live local AI is ready, the model is missing, or fallback behavior will be used.

## Implemented AI Actions

### Draft generation

The default `POST /api/generate` path returns:

- `title`,
- `summary`,
- `quote`,
- `sections`,
- and `diagnostics`.

### Block rewrite

When `mode` is `rewrite-block`, the same endpoint rewrites a single caption or paragraph in the selected tone.

## Live Model Path

When Ollama is reachable and the configured model is installed:

- the server keeps up to 10 ordered assets in the generation request,
- the server forwards live image payloads for the first 5 assets,
- extracts base64 image payloads from the browser working copies,
- sends a strict JSON asset-analysis request to build a compact day story map,
- sends a second strict JSON request that drafts from that story map,
- and normalizes the returned draft before it reaches the client.

The prompt explicitly forbids invented names, dates, relationships, or unsupported travel details.

### Story map generation

The compose path now treats the uploaded photo set as one ordered day story before writing captions. Asset analysis produces:

- `sequenceSummary`,
- `narrativeThread`,
- `dayContext`,
- `theme`,
- `storyArc` with `beginning`, `middle`, `turn`, and `ending`,
- and one per-photo asset entry with `summary`, `mood`, `storyRole`, and `captionSeed`.

The draft stage consumes that story map so each caption reads as the next story beat rather than as literal image description. This JSON shape is intentionally compact so future iOS and Android clients can reuse the same contract with smaller native or on-device runtimes.

## Fallback Path

The fallback path is part of the intended prototype experience, not an error screen.

Fallback draft generation is used when:

- Ollama is offline,
- the model is not installed,
- the model request fails,
- the response is invalid JSON,
- the response has no usable sections,
- or the grounding guard rejects the output.

Fallback rewrite is used when the live rewrite path is unavailable or fails.

## Grounding Guard

The server rejects model drafts that introduce ungrounded details. The current checks look for:

- years not present in the note,
- month or season words not present in the note,
- and capitalized proper nouns that do not appear in the note.

If those checks fail, the prototype falls back to grounded template copy rather than passing the model response through.

## Tone Behavior

The prototype supports four tone labels:

- `romantic`
- `playful`
- `diary`
- `editorial`

The live prompt and fallback rewrite path both use those labels, but the result is still lightweight prototype copy rather than a fully staged editorial system.

## Current Limitations

- No resumable generation stages.
- No stored generation artifacts.
- No voice note or transcript input.
- No layout planning stage.
- No provenance history beyond the last returned diagnostics object.
- No validated multimodal mobile runtime.
- Only the first 5 selected photos receive live image analysis today; later photos participate through sequence order, notes, and the compact story map.

## Honest Framing

This prototype proves that local drafting and local fallback can coexist behind a simple UI. It does not prove native on-device inference, production latency on phones, or release-ready AI orchestration.
