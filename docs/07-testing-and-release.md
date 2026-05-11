# Testing and Release Framing

## Current Validation Surface

The current repo has a real but narrow validation loop.

### Automated checks that exist now

- `npm test` at the repo root runs server fallback, runtime JSON parsing, dev startup, and packaged smoke unit tests.
- `npm run test:client` runs the browser-side unit tests under `app/`.
- `npm run build` at the repo root builds the browser client through `app/`.
- `npm run lint` checks the browser client with ESLint.
- `npm run smoke:packaged` validates the unpacked Windows distribution resource layout.
- `npm run smoke:desktop-single-file` validates the top-level portable EXE, size gate, packaged resource layout, and embedded runtime health.
- `npm run smoke:desktop-quality` sends fixture images through the packaged embedded runtime and rejects fallback-only, invalid, or looping generation output.

### What the shipped test actually covers

- fallback draft generation shape,
- fallback rewrite string generation,
- grounding guards that reject ungrounded model output,
- dev browser startup orchestration,
- and packaged distribution resource presence.

### What is not covered yet

- browser UI behavior,
- archive persistence edge cases,
- export correctness,
- multi-browser compatibility,
- or mobile device behavior.

## Manual Smoke Checklist

For the browser development path, a useful manual pass is:

1. Start the browser prototype with `npm run dev:app`.
2. Confirm the health banner reflects the live or fallback path honestly.
3. Import 3 to 10 photos.
4. Generate a memoir draft.
5. Edit title, summary, and at least one section.
6. Save to the archive and reopen the saved memoir.
7. Download the HTML export.
8. Open the print flow and confirm the current content is rendered.

For the Windows one-file portable distribution:

1. Run `npm run prepare:desktop-model`.
2. Run `npm run dist:desktop:single-file`.
3. Run `npm run smoke:desktop-single-file`.
4. Run `npm run smoke:desktop-quality`.
5. Launch `desktop/dist/Memoir-0.1.0-portable.exe`.
6. Confirm the desktop window opens without unzipping or installing and the health banner reports the packaged local AI path honestly.

## Release Framing

The honest release label for the current repo is:

`Windows portable local prototype`

It should not be described as:

- beta,
- mobile-ready,
- encrypted,
- native,
- or production-safe for personal archives.

## Current Release Risks

- Browser IndexedDB is the active saved-archive persistence layer.
- Export leaves the limited local boundary.
- Dev mode can use optional local Ollama, while the Windows portable distribution carries an embedded llama runtime and bundled Qwen3.5 0.8B Q5_K_M model tier.
- The fallback path can be visibly less polished than the live path.
- Automated coverage is broader than the first prototype pass, but still too thin for broader release claims.

## Minimum Bar Before Any Wider Release

Before calling Memoir anything beyond a local prototype, the project needs:

- stronger storage and deletion behavior,
- clearer export safeguards,
- broader automated test coverage,
- device and browser validation,
- a final support statement,
- and signed or otherwise polished portable distribution packaging.

## Current Diagnostics Story

The UI exposes only lightweight runtime diagnostics:

- health text,
- stage label,
- backend source,
- model,
- and reason.

That is enough for prototype debugging, but not enough for production support.
