# Platform Support and Performance: Current Prototype

## Support Statement

Memoir currently supports developer-run prototype use, not consumer release use.

### Supported path

- A modern desktop browser.
- The local Node server running on the same machine.
- Optional Ollama running on that same machine for live AI responses.

### Best current reference path

- Chromium-based desktop browser.
- Same-machine local server at `http://localhost:8787`.
- Vite dev server proxying `/api` during local development.

### Experimental path

- Another browser on the same local network, when the operator manually points the Local AI URL at a reachable server.

### Not supported today

- native iOS or Android installs,
- App Store or Play Store upload artifacts,
- background execution or resume guarantees,
- broad device compatibility claims,
- or end-user deployment without developer setup.

## Current Performance Reality

The prototype performance profile depends more on browser memory and local model responsiveness than on a tuned mobile runtime.

### Client-side processing

- The browser accepts up to 10 selected photos.
- Each image is resized so its longest side is at most `1280` pixels.
- Each image is re-encoded as JPEG with quality `0.78`.

### Server-side generation

- The live model path currently forwards at most the first 5 assets for live image analysis.
- All selected assets still participate through sequence order and the story-map contract.
- Draft quality and latency depend on the local model, machine, and Ollama health.
- The fallback path is usually faster, but it is intentionally simpler.

### Archive and export

- Saved memoirs depend on browser IndexedDB capacity.
- Large image-heavy memoirs can stress browser memory.
- PDF output depends on the browser print engine rather than a dedicated renderer.

## Current Limits That Matter

- No tested mobile support matrix.
- No native shell performance data.
- No resumable generation after a browser refresh.
- No benchmarked memory ceiling for longer sessions.
- Only the first 5 selected photos receive live image analysis today.

## Honest Performance Framing

The correct way to describe performance today is:

- quick enough for prototype review on a desktop-class development machine,
- variable when live Ollama generation is enabled,
- and not yet validated for mobile release readiness.

## Before Making Broader Support Claims

The following work must happen first:

- define a real support matrix,
- test actual mobile packaging paths,
- move beyond browser IndexedDB as the only saved-archive layer,
- benchmark live generation on target hardware,
- and replace the print-based PDF path with a dedicated export pipeline.
