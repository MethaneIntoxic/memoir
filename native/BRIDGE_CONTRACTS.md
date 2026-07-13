# Native Bridge Contracts

The React renderer owns product behavior; native code owns platform storage, photo access, export/share, and local inference. Platform implementations may change internally while these contracts remain stable.

## StorageAdapter

- `list(): Promise<MemoirSummary[]>`
- `load(id: string): Promise<Memoir>`
- `save(memoir: Memoir): Promise<void>`
- `delete(id: string): Promise<void>`
- `clear(): Promise<void>`

Current shared archive persistence uses IndexedDB inside each shell. Future native storage must remain app-private and use platform key stores for encryption keys.

## PhotoAdapter

- `pick(options): Promise<Asset[]>`
- `sanitize(input): Promise<Asset>`

The renderer currently sanitizes selected images to the shared `Asset` shape: `id`, `name`, `dataUrl`, `width`, and `height`. Native runtime staging accepts only bounded JPEG, PNG, or WebP data URLs.

## LocalRuntimeAdapter

- `health(): Promise<RuntimeHealth>`
- `prepare(): Promise<RuntimeHealth>`
- `stageAsset({ assetId, dataUrl }): Promise<void>`
- `clearStagedAssets(): Promise<void>`
- `generate(input): Promise<GenerateMemoirPayload>`
- `rewrite(input): Promise<{ text: string }>`
- `cancel(jobId: string): Promise<void>`

The Capacitor plugin exposes the corresponding methods as `health`, `prepare`, `stageAsset`, `clearStagedAssets`, `generateMemoir`, `rewrite`, and `cancelGeneration`.

Mobile is fail-closed. If preparation fails, the adapter returns or throws a stable `native-ai-*` error and never sends memoir data to a hosted or LAN endpoint. Both compose and first-action rewrite must run the health/prepare gate.

## ExportAdapter

- `writeMemoir(memoir): Promise<FileHandle>`
- `writeHtml(memoir): Promise<FileHandle>`
- `writePdf(memoir): Promise<FileHandle>`
- `share(file): Promise<void>`

Portable archives must use the format in `packages/memoir-core`. Browser downloads and Android/iOS app-private share-sheet files are implemented for `.memoir`, HTML, slide ZIPs, and diagnostics. The native print/PDF action shares deterministic HTML into the system sheet; actual “Save as PDF” availability and every share destination remain physical-device acceptance items.
