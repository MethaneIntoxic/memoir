import {
  buildDiagnosticsFileName,
  buildMemoirDiagnosticsExport,
  buildMemoirFileName,
  buildPortableMemoirArchive,
  buildPortableMemoirFileName,
  parsePortableMemoirArchive,
  PORTABLE_MEMOIR_MIME,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
  type Memoir,
  type MemoirDiagnosticsExportPayload,
} from '../../../packages/memoir-core/index.mjs'

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadBytes(name: string, content: Uint8Array, type: string) {
  const arrayBuffer = new ArrayBuffer(content.byteLength)
  new Uint8Array(arrayBuffer).set(content)
  const url = URL.createObjectURL(new Blob([arrayBuffer], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportMemoirHtml(memoir: Memoir) {
  downloadFile(buildMemoirFileName(memoir.title, 'html'), renderMemoirHtml(memoir), 'text/html;charset=utf-8')
}

export function exportPortableMemoir(memoir: Memoir) {
  downloadBytes(buildPortableMemoirFileName(memoir.title), buildPortableMemoirArchive(memoir), PORTABLE_MEMOIR_MIME)
}

export function exportMemoirDiagnostics(memoir: Memoir) {
  downloadFile(
    buildDiagnosticsFileName(memoir.title),
    renderMemoirDiagnosticsJson(memoir),
    'application/json;charset=utf-8',
  )
}

export async function importPortableMemoirFile(file: File): Promise<Memoir> {
  const result = parsePortableMemoirArchive(await file.arrayBuffer())
  return result.memoir
}

export function openMemoirPrintPreview(memoir: Memoir): boolean {
  const preview = window.open('', '_blank', 'noopener,noreferrer')
  if (!preview) {
    return false
  }

  preview.document.write(renderMemoirHtml(memoir))
  preview.document.close()
  preview.focus()
  preview.print()
  return true
}

export {
  buildMemoirDiagnosticsExport,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
  type MemoirDiagnosticsExportPayload,
}
