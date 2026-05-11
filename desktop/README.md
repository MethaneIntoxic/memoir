# Memoir Desktop Shell

This folder packages the current Memoir browser app as a desktop shell.

Current direction:

- Electron starts the existing local Memoir server automatically.
- The packaged renderer loads the built Vite app from disk.
- The packaged server prefers the embedded local runtime when bundled resources are present.
- The default bundled model target is `qwen3.5-0.8b-q5_K_M`.

What is scaffolded here now:

- `main.cjs`: starts the local Memoir server and opens the desktop window.
- `preload.cjs`: exposes the packaged API base to the renderer.
- `resources/memoir-default-model.json`: manifest for the selected bundled local model profile.
- `electron-builder.config.cjs`: dynamic release config that packages only the selected model, mmproj, ready marker, server, renderer, and llama runtime files.

Current distribution target:

- `desktop/dist/Memoir-0.1.0-portable.exe` is the canonical one-file Windows artifact for sending to another Windows user.
- `desktop/dist/win-unpacked/Memoir.exe` remains the staging and diagnostic executable used by smoke tests.
- `npm run smoke:desktop-single-file` verifies the top-level portable EXE, packaged runtime/resource layout, model size gate, and embedded runtime health.

What still needs before broader shipping:

- code signing and installer polish,
- clean-machine portable EXE smoke on target Windows versions.
