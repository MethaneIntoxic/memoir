import {
  buildDiagnosticsFileName,
  buildMemoirDiagnosticsExport,
  buildMemoirFileName,
  buildPortableMemoirArchive,
  buildPortableMemoirFileName,
  exportInstagramFeedSlides,
  parsePortableMemoirArchive,
  PORTABLE_MEMOIR_MIME,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
  type Memoir,
  type MemoirDiagnosticsExportPayload,
  type MemoirSlide,
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

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('instagram-slide-image-load-failed'))
    image.src = dataUrl
  })
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean)
  let line = ''
  let lineCount = 0

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word
    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine
      continue
    }

    if (line) {
      context.fillText(line, x, y + lineCount * lineHeight)
      lineCount += 1
    }

    line = word
    if (lineCount >= maxLines - 1) {
      break
    }
  }

  if (line && lineCount < maxLines) {
    context.fillText(line, x, y + lineCount * lineHeight)
  }
}

function drawCroppedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  let sourceX = 0
  let sourceY = 0

  if (imageRatio > targetRatio) {
    sourceWidth = sourceHeight * targetRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = sourceWidth / targetRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

async function renderInstagramSlidePng(slide: MemoirSlide): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = slide.width
  canvas.height = slide.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('instagram-slide-canvas-unavailable')
  }

  context.fillStyle = '#fff9f7'
  context.fillRect(0, 0, slide.width, slide.height)
  context.fillStyle = '#edf4f8'
  context.fillRect(54, 54, slide.width - 108, slide.height - 108)

  const image = await loadImage(slide.asset.dataUrl)
  drawCroppedImage(context, image, 84, 84, 912, 840)

  context.fillStyle = '#fff9f7'
  context.fillRect(84, 924, 912, 342)
  context.strokeStyle = '#242020'
  context.lineWidth = 4
  context.strokeRect(84, 84, 912, 1182)

  context.fillStyle = '#49634d'
  context.font = '700 28px Inter, Arial, sans-serif'
  context.fillText(`${String(slide.index).padStart(2, '0')} / ${String(slide.count).padStart(2, '0')}`, 128, 998)

  context.fillStyle = '#242020'
  context.font = '500 58px Georgia, Times New Roman, serif'
  drawWrappedText(context, slide.rawCaption, 128, 1070, 824, 66, 2)

  context.fillStyle = '#665d5e'
  context.font = '400 34px Inter, Arial, sans-serif'
  drawWrappedText(context, slide.rawBody, 128, 1198, 824, 44, 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('instagram-slide-render-failed'))
        return
      }

      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/png')
  })
}

export async function exportInstagramSlides(memoir: Memoir) {
  const bytes = await exportInstagramFeedSlides(memoir, { renderSlide: renderInstagramSlidePng })
  downloadBytes(buildMemoirFileName(memoir.title, 'instagram-slides.zip'), bytes, 'application/zip')
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
