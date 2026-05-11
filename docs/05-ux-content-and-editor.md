# UX, Content, and Editor: Current Prototype

## Current UX Shape

The current UI is a single-page browser flow with three main views:

- archive,
- compose,
- editor.

It already carries the intended scrapbook tone, but it is still a prototype UI with lightweight controls and minimal state management.

## Archive View

### Empty state

- headline: `Your life, romanticized.`
- primary action: create a new memoir.
- promise: import 3 to 10 photos, draft locally, keep the result as a long-form keepsake.

### Saved archive state

- shows saved memoir cards,
- uses the first photo as the card image,
- labels memoirs with the created date,
- and reminds the user that the archive is saved locally in the browser for this prototype.

## Compose View

The compose screen currently combines import, setup, and generation into one panel.

### Inputs available now

- photo picker,
- tone buttons,
- personal note field,
- music cue field,
- local AI URL field.

### Current import behavior

- the browser accepts image files,
- resizes them before generation,
- and shows previews of the selected working copies.

### Current generation feedback

The status strip exposes simple text states such as:

- `Sanitizing photos`,
- `Ready to generate`,
- `Preparing local memoir prompt`,
- `Drafting with local AI`,
- and `Draft ready`.

This is informative enough for a prototype, but it is not a full progress system.

## Editor View

The editor is the heart of the current prototype.

### Text that can be edited directly

- memoir title,
- memoir summary,
- memoir quote,
- section captions,
- section body text.

### Section actions implemented now

- move section up,
- move section down,
- polish caption,
- polish paragraph.

### Sidebar actions implemented now

- save to archive,
- download web memoir,
- print or save PDF.

## Tone and Theme Controls

### Tone presets

- `romantic`
- `playful`
- `diary`
- `editorial`

### Theme presets

- `noir-journal`
- `soft-archive`
- `film-notes`

These settings affect draft generation labels and presentation, but they are still lightweight prototype controls rather than a deeply modeled design system.

## Diagnostics in the UI

The prototype already surfaces a small amount of useful honesty:

- health status from the local AI server,
- current stage label,
- backend source,
- selected model,
- and the reason attached to the returned draft.

That makes it clear whether the user is seeing live local AI output or fallback copy.

## Important UX Limits

- No voice note input.
- No undo or redo.
- No delete or duplicate block action.
- No per-block provenance badge.
- No autosave to durable storage beyond the explicit IndexedDB save action.
- No true mobile-optimized editor validation yet.
- No dedicated export preview step.

## Honest UX Framing

The current prototype should be described as an editable memoir demo with local draft generation, not as a finished editorial studio. Its strongest user-facing value today is that the draft remains easy to inspect, rewrite, and export in one session.