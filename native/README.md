# Native Integration

This folder holds mobile-native integration contracts and implementation notes for:

- photo import,
- secure storage access,
- local model runtime adapters,
- speech capture/transcription bridges,
- share and print integrations.

The native layer must expose clear interfaces to the shared UI and must not own memoir business rules.

## Current Files

- `BRIDGE_CONTRACTS.md`: Storage, photo, runtime, and export adapter contracts.
- `MOBILE_RUNTIME.md`: On-device model/runtime delivery strategy for iOS and Android.
