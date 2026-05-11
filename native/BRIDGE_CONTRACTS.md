# Native Bridge Contracts

The React app talks to native features through small adapters. Native iOS and Android code can change internally as long as these contracts stay stable.

## StorageAdapter

- `list(): Promise<MemoirSummary[]>`
- `load(id: string): Promise<Memoir>`
- `save(memoir: Memoir): Promise<void>`
- `delete(id: string): Promise<void>`
- `clear(): Promise<void>`

Storage must live in app-private storage. Future encryption must use platform key stores.

## PhotoAdapter

- `pick(options): Promise<Asset[]>`
- `sanitize(input): Promise<Asset>`

Native adapters should return the same sanitized `Asset` shape as the browser path: `id`, `name`, `dataUrl`, `width`, `height`.

## RuntimeAdapter

- `health(): Promise<RuntimeHealth>`
- `generate(input): Promise<GenerateMemoirPayload>`
- `rewrite(input): Promise<{ text: string }>`
- `cancel(jobId: string): Promise<void>`

Adapters must prefer on-device runtime. If unavailable, they must report fallback readiness rather than silently using hosted AI.

## ExportAdapter

- `writeMemoir(memoir: Memoir): Promise<FileHandle>`
- `writeHtml(memoir: Memoir): Promise<FileHandle>`
- `writePdf(memoir: Memoir): Promise<FileHandle>`
- `share(file: FileHandle): Promise<void>`

`writeMemoir` must use the portable `.memoir` archive format from `packages/memoir-core`.
