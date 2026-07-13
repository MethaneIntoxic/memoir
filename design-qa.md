# Memoir design QA

- Source visual truth: `wireframes/home_empty_state/screen.png`
- Implementation: `output/design-qa/mobile-390x844-final.png`
- Combined comparison: `output/design-qa/home-empty-comparison-final.png`
- Desktop responsive proof: `output/design-qa/desktop-1440x900-final.png`
- Viewport and state: 390 x 844, empty local archive; responsive proof at 1440 x 900

## Full-view comparison evidence

The final mobile capture preserves the wireframe's editorial header, centered keepsake frame, serif hierarchy, primary memoir CTA, and persistent bottom navigation. The on-device AI strip and Import action are intentional functional additions. They remain compact, do not obscure the primary CTA, and do not introduce horizontal overflow.

## Focused-region evidence

A separate crop was not necessary because the 980 x 940 combined comparison keeps the header, runtime strip, hero, buttons, and navigation legible at the exact mobile viewport. The final metrics recorded a 44px status strip, 56px primary CTA, and a document scroll width smaller than the 390px viewport.

## Findings and comparison history

- First pass, P1: the runtime status block consumed excessive mobile height and pushed actions into the fixed navigation region.
  - Fix: reduced the mobile status strip to 44px, kept its full explanation in the accessible label, tightened the keepsake and action widths, and reserved mobile safe-area space.
  - Post-fix evidence: `output/design-qa/home-empty-comparison-final.png`; the primary Create and secondary Import actions are fully visible above the navigation.
- First desktop pass, P1: sticky desktop navigation overlaid the empty-state Import action.
  - Fix: desktop/tablet navigation now participates in normal document flow; only mobile uses the safe-area fixed bar.
  - Post-fix evidence: `output/design-qa/desktop-1440x900-final.png`; no navigation overlay remains.
- Typography: serif display treatment, italic supporting copy, uppercase wordmark, and compact sans-serif controls align with the source hierarchy.
- Spacing and layout: centered proportions now closely track the source; the runtime strip is the only intentional extra region.
- Colors and tokens: paper background, ink foreground, pale archive frame, cranberry runtime warning, and restrained shadows remain coherent with the noir-journal system.
- Image quality: the existing keepsake asset is sharp, correctly framed, and uses the source's pale archival treatment.
- Copy and content: the source's empty-state message is preserved; runtime and Import copy are functional additions.
- Accessibility and interactions: Create navigation and the file input were exercised, keyboard-focus styles remain present, fixed mobile navigation respects safe-area insets, and no browser console errors were recorded.

## Follow-up polish

- P3: a real-device photo-picker screenshot can validate the operating-system selection surface, which the browser cannot faithfully reproduce.

## Settings and share/export audit

- Source visual truth: `wireframes/settings_profile/screen.png` and `wireframes/share_export/screen.png`
- Implementations: `output/flow-audit/08-settings-mobile.png` and `output/flow-audit/09-share-export-mobile.png`
- Additional states: `output/flow-audit/10-share-export-error-mobile.png`, `output/flow-audit/11-clear-confirmation-mobile.png`, `output/flow-audit/12-settings-desktop.png`, and `output/flow-audit/13-editor-desktop.png`
- Viewports and state: 390 x 844 and 1440 x 900 with a locally seeded three-chapter memoir

### Findings and repair history

- P0: the settings/profile wireframe had no reachable implementation.
  - Fix: added a fourth Settings destination with local-AI health, privacy, theme, archive count, exports, diagnostics, and confirmation-gated archive clearing.
- P0: the share/export wireframe had no implementation.
  - Fix: added an accessible export dialog with real PDF-preview, HTML, portable `.memoir`, and 4:5 slide actions plus progress and friendly error states.
- P1: the mobile editor save panel overlaid memoir content.
  - Fix: kept the editor sidebar in document flow below 980px and sticky only on desktop.
- P1: long memoir titles and chapter movement labels clipped at desktop card widths.
  - Fix: made the title textarea content-sized with a four-row fallback and replaced narrow movement text with labeled arrow controls.
- P2: modal background controls remained exposed to assistive technology.
  - Fix: moved dialogs outside the app shell and marks the background shell `inert` and `aria-hidden` while a dialog is open. Escape, initial focus, and destructive-action cancellation were exercised.
- P2: the mobile editor toolbar label clipped.
  - Fix: constrained and right-aligned the status copy at narrow widths.

### Live verification

- No horizontal overflow at 390px.
- A cold reload produced no console warnings or errors.
- Theme switching, share opening/closing, modal focus, Escape handling, and clear cancellation were exercised successfully.
- The browser extension could not exercise the native photo picker because local-file access is disabled.
- The browser security policy blocked creation of a new combined settings/share comparison canvas. Source and implementation captures were inspected individually, so this section is recorded as a comparison-evidence limitation rather than a pass.

final result: core archive/compose comparison passed; settings/share comparison evidence blocked by browser policy
