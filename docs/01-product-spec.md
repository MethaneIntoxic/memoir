# Memoir Product Spec

## Product summary

Memoir privately turns 3 to 10 ordered photos into an editable scrapbook story using local AI. The same product flow runs in browser development, Windows desktop, Android, and iOS shells.

## Core flow

1. Open or import the local archive.
2. Select, remove, and reorder 3 to 10 photos.
3. Choose `romantic`, `playful`, `diary`, or `editorial` tone and add optional notes/music context.
4. Prepare the local model when required and generate a draft.
5. Read, edit, reorder, and rewrite story sections.
6. Save and reopen the memoir locally.
7. Export portable `.memoir`, HTML, print/PDF-oriented output, or Instagram slide ZIP.

## Product contract

- AI output stays editable and preserves selected photo order.
- Diagnostics state the actual runtime/model and never label fallback as live inference.
- Mobile AI is offline and fail-closed.
- At most five sanitized photos are classified locally; bounded labels, not raw bytes, enter the text prompt.
- Destructive archive clearing requires confirmation.
- Exports reflect the current edited state and clearly leave the private app boundary.
- Loading, preparation, generation, cancellation, empty, success, and error states remain visible and keyboard accessible.

## Implemented boundaries

- Archive persistence is IndexedDB within the active app/browser profile, with migration from older local storage.
- There is no account, sync, cloud backup, collaboration, public-link publishing, or hosted mobile inference.
- Storage is not an encrypted media vault.
- Mobile app-private file sharing is implemented for the export formats; destination behavior and system print/PDF still require device acceptance before public release claims.
- Physical device support is restricted to the validated matrix; no broad phone compatibility claim is allowed before hardware evidence.

## Acceptance

The product implementation is accepted when the automated repository/desktop/native CI gates pass and the UI matches the source wireframes. Mobile distribution is accepted only after the separate physical and signing gates in `docs/15-physical-device-acceptance.md` pass.
