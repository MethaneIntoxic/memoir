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
- Fresh implementations: `output/playwright/memoir-final/settings-mobile-selected-top-390x844.png`, `output/playwright/memoir-final/settings-mobile-selected-bottom-390x844.png`, and `output/playwright/memoir-final/share-export-mobile-390x844.png`
- Combined comparison: `output/playwright/memoir-final/settings-share-comparison-final.png`
- Focused comparisons: `output/playwright/memoir-final/settings-comparison-focused.png` and `output/playwright/memoir-final/share-export-comparison-focused.png`
- Desktop responsive proof: `output/playwright/memoir-final/settings-desktop-1440x900.png` and `output/playwright/memoir-final/settings-desktop-bottom-1440x900.png`
- Viewports and state: 390 x 844 and 1440 x 900 with a locally seeded selected memoir titled `Summer in Kyoto`

### Fresh comparison evidence

- Full view: the combined board places both source wireframes beside the fresh implementation captures in one browser-rendered comparison. The settings implementation preserves the editorial header, centered profile treatment, serif hierarchy, boxed rows, thin rules, restrained green/ink palette, hard-offset shadows, destructive footer action, and four-destination navigation. Account, notification, film-grain, and sign-out rows are intentionally replaced by local-AI health, privacy, archive count, export, diagnostics, and local clearing because Memoir has no account or cloud service.
- Focused settings regions: separate top and bottom 390 x 844 captures keep profile, device health, privacy, theme, archive, export, diagnostics, destructive action, and navigation readable without relying on Playwright's fixed-navigation full-page stitching.
- Focused share region: the source and implementation modal remain aligned on title hierarchy, close control, descriptive copy, four large export rows, icon/action rhythm, primary dark final action, border, and offset shadow. Web-link, Pinterest, and physical-print concepts are intentionally implemented as real offline HTML, portable `.memoir`, and 4:5 slide exports.
- Typography: the implementation keeps the source's italic serif wordmark and display hierarchy, with compact uppercase labels and legible sans-serif controls. Wrapping remains clean at both tested widths.
- Spacing and layout: mobile rows retain practical touch targets and consistent vertical rhythm; desktop content stays centered and navigation remains in normal document flow without covering archive actions.
- Colors and tokens: paper, ink, pale archive green, muted status green, and pale destructive red map consistently to the wireframes. Contrast and focus states remain visible.
- Image and icon quality: the implementation uses the app's real icon library and existing profile treatment; no target imagery is replaced by CSS art, emoji, or placeholder glyphs. The generic private-profile illustration is intentional because the product stores no account identity.
- Copy and content: all visible copy describes implemented local behavior. No cloud sharing, notifications, account editing, sign-out, Pinterest, or physical ordering is falsely advertised.
- Browser verification: settings navigation, archive selection, share open/close, Escape dismissal, clear-confirmation open/Escape cancellation, selected navigation state, 390 x 844 scrolling, and 1440 x 900 responsive layout were exercised. The application console reported 0 errors and 0 warnings; the comparison-only static page reported one irrelevant missing-favicon 404.

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
- Fresh source and implementation captures were rendered together in `output/playwright/memoir-final/settings-share-comparison-final.png`; focused settings and share comparisons were captured from that same board.
- No actionable P0, P1, or P2 settings/share findings remain. The remaining native photo-picker and physical-device checks are platform validation gaps, not browser-visible design defects.

## 2026-08-12 creation, reader, and social-carousel pass

- Fresh captures: `output/qa-home-390.png`, `output/qa-create-390.png`, `output/qa-create-two-390.png`, `output/qa-reader-390.png`, `output/qa-share-390.png`, and `output/qa-create-1440.png`.
- The visual direction keeps the editorial Memoir identity but replaces the heavier monochrome panels with warm paper, ink, sage status, and restrained blush selection. It uses candid user photos as the visual focus and avoids treating young women as one aesthetic segment.
- Research constraints: Material 3 informed reachable controls and visible state; Android Sharesheet is the privacy-preserving multi-image handoff; direct TikTok Share Kit integration is deferred because it introduces platform credentials and approval without removing the user's final posting step. Recent research on Gen Z social media behavior supports authentic, self-directed presentation over an over-polished branded look.
- Create no longer changes shell width. With two photos, the primary action says `Add 1 more photo`; after three, it becomes the creation action. Advanced local-route configuration is hidden outside developer mode.
- Reader uses horizontal CSS scroll snap on mobile and desktop. At 390px, the measured track was 366px wide with 904px scroll content, confirming a real horizontal carousel rather than a static stacked layout.
- Social export is labeled `Instagram / TikTok carousel`, renders one 1080 x 1350 PNG per chapter, and shares the ordered files directly on mobile. Browser verification covered the export action and modal state; target-app ingestion remains a physical-device gate.
- Fresh Playwright verification reported 390px body `scrollWidth` and `clientWidth`, so no horizontal page overflow exists. Archive, Create, Reader, and Share completed without console errors.

Research references: [Material 3](https://m3.material.io/), [Android Sharesheet](https://developer.android.com/training/sharing/send), [TikTok Share Kit](https://developers.tiktok.com/doc/share-kit-android-quickstart-v2), and [Frontiers research on Gen Z authenticity](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1651435/full).

## 2026-08-13 mobile performance and fresh-flow verification

- Fresh accepted captures: `output/playwright/memoir-current-audit/01-archive-mobile.png`, `02-reader-mobile.png`, `03-share-mobile.png`, `04-share-desktop.png`, and `08-create-mobile-final-settled.png`.
- The visual direction remains photo-first, editorial, candid, and user-authored rather than applying a stereotyped "female" palette. Research is translated into autonomy, clear privacy, fast paths, authentic copy, and strong visual hierarchy instead of demographic decoration.
- The persistent AI strip now renders the compact visible states `Ready`, `Preparing`, `Checking`, or `Unavailable`; its full model/error detail remains in the accessible label, tooltip, and Settings.
- At 390 x 844, Create had no horizontal overflow: document `scrollWidth` equaled `clientWidth` at 375 CSS px after the desktop scrollbar was accounted for. The final primary action ended 34 px above the fixed bottom navigation.
- Archive and Create share the same responsive shell. Their measured 15 px desktop-browser difference came only from Create requiring a vertical scrollbar; neither view expands past its available layout viewport.
- The Reader presented a real horizontal three-slide track, and the share dialog fit at 390 x 844 and 1440 x 900 without clipped labels or nested scrolling.
- The browser-only session recorded two expected Vite proxy 502 responses for `/api/health` because no API/native runtime was started. It recorded no React exception, layout error, or console warning. Native health behavior remains covered by bridge tests and the physical-device gate.
- TikTok's current Android guide explicitly supports `ACTION_SEND_MULTIPLE`, multiple image URIs, `image/*`, and read grants without Share Kit. The existing system chooser remains the smallest offline implementation and preserves user confirmation. Target-app ingestion is still a physical-device acceptance item.

Additional research reference: [Android thermal and CPU guidance](https://developer.android.com/games/optimize/adpf).

final result: passed
