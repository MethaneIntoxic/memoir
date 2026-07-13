# Memoir Implementation Overview

The authoritative release architecture is `docs/ARCH_BLUEPRINT.md`. This page is the short product-level view.

## Implemented system

Memoir has one React/Vite product UI and three delivery shells:

- browser development plus local Node API;
- packaged Electron desktop with embedded local llama inference;
- Capacitor Android and iOS projects with native on-device llama inference.

Users can import and order 3 to 10 photos, add narrative context, generate an editable story, rewrite sections, save/reopen locally, read the scrapbook layout, and export portable/HTML/slide/diagnostic artifacts.

Mobile uses bounded platform photo labels—ML Kit on Android and Vision on iOS—as context for a pinned text model. It does not send raw photo bytes to llama or fall through to a network runtime.

## Truth boundary

Proven now:

- browser UI behavior and responsive design QA;
- Windows packaged real-model inference;
- Android arm64 packaging and Android emulator native inference;
- iOS simulator native inference and unsigned arm64 Release compilation;
- local-only mobile runtime routing and Android APK permission enforcement.

Not yet proven:

- physical phone latency, peak memory, thermals, and lifecycle behavior;
- signed Android Release execution;
- signed iPhone Release execution, Xcode 26 archive validation, or TestFlight processing;
- encrypted archive storage or cloud backup;
- native mobile export/share and dedicated PDF behavior across supported devices.

The source can be implementation-complete while distribution readiness remains false. `docs/15-physical-device-acceptance.md` defines the evidence needed to cross that boundary.
