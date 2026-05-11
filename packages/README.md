# Shared Packages

This folder holds cross-app packages for:

- domain rules,
- storage repositories,
- memoir schema and migrations,
- AI orchestration,
- renderer and layout engine,
- shared types and errors.

These packages form the long-term product core and should stay wrapper-agnostic.

## Implemented

- `memoir-core`: shared schema parsing, deterministic HTML/diagnostics rendering, portable `.memoir` archive import/export, native bridge contract metadata, and release artifact metadata.
