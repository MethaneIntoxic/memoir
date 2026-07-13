# Delivery Status and Remaining Gates

The old phase 0–9 labels described prototype milestones; they are not release maturity levels. Current planning uses evidence gates instead.

## Implemented

- Shared versioned memoir contracts and portable archive.
- Responsive wireframe-backed archive, compose, reader, editor, settings, and export UI.
- Sanitized ordered photo flow, staged generation, rewrite, cancellation, explicit save/import/export, and unsaved-work guards.
- Browser/local API path with Ollama and grounded development fallback.
- Packaged Windows portable app with real embedded-model quality smoke.
- Android arm64 native project, JNI llama inference, ML Kit photo context, final-APK offline enforcement, model integrity/recovery checks, and native share bridge.
- iOS native project, Swift llama inference, Vision photo context, lifecycle protection, unsigned arm64 Release build, and native share bridge.
- Broad repository/client contracts, browser QA, native CI, and release-readiness reporting.

## Hardware/signing gates

1. Run the public Android flow on the lowest supported arm64 phone offline; capture latency, memory, thermal, lifecycle, cancellation, persistence, and export evidence.
2. Repeat against a signed Android Release APK.
3. Run the equivalent signed iPhone flow with Xcode 26+.
4. Verify/archive/upload the iOS build, install the processed TestFlight artifact, and repeat offline acceptance.
5. Sign and clean-profile-test the Windows portable executable for public distribution.

## Post-v1 backlog

- Encrypted durable archive/media storage and an opt-in backup design.
- Dedicated native PDF renderer and destination-specific export QA.
- Undo/redo, revision history, block duplicate/delete, and provenance controls.
- Voice-note transcription with the same local/privacy boundary.
- Expanded supported-device/browser matrix, crash policy, and accessibility/usability studies.

The current truth is: source-ready, desktop locally validated, mobile simulator/emulator proven, physical mobile release evidence still pending.
