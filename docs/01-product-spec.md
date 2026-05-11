# Product Spec: Current Prototype

## Product Summary

Memoir currently demonstrates a browser-based memoir drafting flow. A user imports 3 to 10 photos, adds optional context, requests a draft from a local server, edits the result, and exports it as HTML or through the browser print dialog.

The prototype is meant to answer a narrow question: does this scrapbook-style flow feel valuable before a native app, hardened storage model, or broader release story exists?

## Current Audience

The current audience is internal:

- product and design review,
- local prototype testers,
- and developers validating the browser plus local server flow.

This is not yet positioned for general end users.

## Current Product Goals

- Prove the emotional shape of the memoir flow with real photos.
- Keep AI output editable instead of final.
- Show that the app still behaves sensibly when the model path is offline.
- Validate that a browser UI can move from draft to export in one session.

## Implemented Inputs

- 3 to 10 imported photos.
- One tone preset: `romantic`, `playful`, `diary`, or `editorial`.
- Optional personal note.
- Optional music cue.
- Configurable local API base URL.

## Implemented Outputs

- memoir title,
- memoir summary,
- hero quote,
- one caption and paragraph per section,
- downloadable HTML export,
- and browser print to PDF.

## Current User Flow

1. Open the archive view.
2. Start a new memoir.
3. Import 3 to 10 photos.
4. Add an optional note and music cue.
5. Generate a draft through the local server.
6. Edit the title, summary, quote, captions, and body text.
7. Save the memoir to the local browser archive.
8. Export as HTML or print to PDF.

## Current UX Contract

- The draft must stay editable after generation.
- The app must surface whether it is using live local AI or fallback copy.
- The archive must reopen previously saved memoirs in the same browser.
- Export must use the current edited state, not an earlier draft.

## Current Non-Goals

- native mobile packaging,
- account creation,
- collaboration,
- sync or backup,
- voice note capture,
- cloud inference,
- public link publishing,
- secure media vault behavior,
- or production-ready retention guarantees.

## Prototype Acceptance Criteria

### Create

- The user can select at least 3 photos.
- The browser produces visible working copies for the selected photos.

### Generate

- The app can request a memoir draft from the local API.
- If Ollama is offline or missing the model, the app still returns fallback draft content.

### Edit

- The user can directly edit all visible text fields.
- The user can move sections up and down.
- The user can ask the server to polish a caption or paragraph.

### Save and export

- The user can persist a memoir into the browser archive.
- The user can download a standalone HTML file.
- The user can open the browser print flow for PDF output.

## Known Product Gaps

- No voice note flow.
- No undo and redo.
- No block delete or duplicate.
- No authored-versus-generated provenance labels.
- No revision history.
- No packaged mobile experience.

## Prototype Success Signal

The current prototype is successful if testers can create a memoir, make manual edits, understand whether the AI path is live or fallback, and leave the session with an exportable artifact.