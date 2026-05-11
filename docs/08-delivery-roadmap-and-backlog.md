# Phase 0 to 9 Roadmap Framing

## Why This Doc Exists

The current UI already displays phases `0` through `9`. Those labels can be misleading if they are read as launch readiness levels.

In this repo, phases `0` through `9` are a prototype progress shorthand. They describe what has been wired so far, not what is safe to release.

## Implemented Phase Meanings

### Phase 0: Local runtime path chosen

Implemented now:

- local Node server,
- local Ollama integration,
- fallback drafting when Ollama is unavailable.

### Phase 1: Memoir shape lives in UI state

Implemented now:

- a client-side memoir object with assets, sections, and diagnostics,
- editable text fields for the current draft.

Not implemented yet:

- shared schema package,
- migrations,
- revision history.

### Phase 2: Photo sanitization active

Implemented now:

- browser image resize,
- browser JPEG re-encode,
- preview of working copies before generation.

Not implemented yet:

- hardened EXIF verification,
- encrypted media storage,
- secure asset cleanup.

### Phase 3: AI draft generation active

Implemented now:

- draft generation through `POST /api/generate`,
- block rewrite mode,
- grounding guard,
- fallback draft behavior.

Not implemented yet:

- staged jobs,
- resume and cancel,
- artifact persistence.

### Phase 4: Manual editing active

Implemented now:

- title edit,
- summary edit,
- quote edit,
- caption edit,
- paragraph edit,
- section move up and down.

Not implemented yet:

- undo and redo,
- delete and duplicate block actions,
- revision compare.

### Phase 5: Archive persistence active

Implemented now:

- browser-local archive save,
- reopen saved memoirs,
- clear local archive control.

Not implemented yet:

- durable app storage,
- backup,
- cross-browser persistence.

### Phase 6: HTML export active

Implemented now:

- standalone HTML file download built from the current edited memoir.

Not implemented yet:

- export history,
- metadata verification,
- hosted publishing.

### Phase 7: Printable PDF path active

Implemented now:

- browser print flow opened from the current memoir state.

Not implemented yet:

- dedicated PDF renderer,
- consistent print styling across browsers,
- export QA on real mobile devices.

### Phase 8: Local diagnostics visible

Implemented now:

- health label,
- stage label,
- backend source,
- model label,
- reason label.

Not implemented yet:

- structured diagnostic bundle,
- privacy-reviewed logging policy,
- support tooling.

### Phase 9: Test and build hooks added

Implemented now:

- root build script,
- root test script,
- fallback server test.

Not implemented yet:

- UI tests,
- export regression tests,
- mobile smoke tests,
- release gate automation.

## What Comes After Phase 9

The next work should not be presented as phase `10`. The next work is a release-credibility backlog.

### Release-credibility backlog

1. Replace the current browser IndexedDB prototype store with a stronger storage strategy and clearer privacy guarantees.
2. Define deletion behavior and privacy boundaries precisely.
3. Harden export behavior and verify metadata handling.
4. Expand automated coverage beyond the server fallback path.
5. Keep the Windows one-file portable app shippable at `desktop/dist/Memoir-0.1.0-portable.exe`.
6. Decide the mobile store path separately from the Windows Electron package.
7. Publish a support matrix based on tested environments rather than aspiration.

### Store distribution track

The Windows portable Electron app is not the Play Store or iOS App Store artifact. Store distribution needs its own platform track:

- Android: Capacitor wrapper first, with store-compliant local model/runtime packaging.
- iOS: Capacitor wrapper first, with Apple-approved local inference and file/storage behavior.
- Shared: privacy policy, app signing, review metadata, device QA, crash reporting policy, and release support boundaries.

### Implemented release foundation

- `packages/memoir-core` now owns shared schema, portable `.memoir` archive import/export, export rendering, bridge contract metadata, and release artifact metadata.
- `mobile/` now contains the Capacitor entry point that wraps the existing React app.
- `native/` now records bridge and mobile runtime contracts.
- `docs/11-cross-platform-release-architecture.md` and `docs/12-store-release-checklist.md` are the current release-track references.

## Recommended External Framing

When discussing this repo with other people, use language like:

- `current memoir prototype`,
- `browser client with local AI server`,
- `phase 0 to 9 prototype milestone set`,
- and `not yet release ready`.
