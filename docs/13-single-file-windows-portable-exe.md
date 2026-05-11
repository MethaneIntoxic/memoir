# Single-File Windows Portable EXE

## Target

Memoir's first sendable desktop release target is a single Windows portable EXE:

`desktop/dist/Memoir-0.1.0-portable.exe`

This is the artifact a user can download, double-click, and run without unzipping or installing.

## Model Tier

Default packaged tier:

- tier: `qwen35-0.8b-q5`
- model: `Qwen_Qwen3.5-0.8B-Q5_K_M.gguf`
- projector: `mmproj-Qwen_Qwen3.5-0.8B-f16.gguf`
- context window: `8192`
- max output tokens: `768`
- manifest: `desktop/resources/memoir-default-model.json`

Larger fallback tiers:

- run `npm run prepare:desktop-model -- --tier qwen3vl-q4`
- or run `npm run prepare:desktop-model -- --tier qwen3vl-q3`
- rebuild with `npm run dist:desktop:single-file`
- rerun `npm run smoke:desktop-single-file`

The older Gemma bundle is not the default portable EXE payload. It can be revisited later as a large/high-quality model pack, but it should not be accidentally included in the one-file release.

## Packaging Boundary

`desktop/electron-builder.config.cjs` reads the selected model manifest and packages only:

- built renderer from `app/dist`,
- local server from `server`,
- selected model file,
- selected mmproj file,
- selected ready marker,
- model manifest,
- required llama runtime files.

It must not package the whole `desktop/resources` directory.

## Commands

```bash
npm run prepare:desktop-model
npm run dist:desktop:single-file
npm run smoke:desktop-single-file
```

## Release Gates

- exactly one top-level EXE exists in `desktop/dist`,
- EXE size is below the 2.5 GB hard shipping gate (`2,500,000,000` bytes),
- manifest paths resolve inside `resources/memoir-runtime`,
- model and mmproj byte sizes match the manifest,
- no Gemma GGUF files are bundled,
- packaged `/api/health` reports `runtime: embedded-llama`, `available: true`, and `modelInstalled: true`.
