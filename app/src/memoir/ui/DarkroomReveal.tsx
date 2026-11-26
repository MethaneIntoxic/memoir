import { memo, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MemoirSlide } from '../../../../packages/memoir-core/index.mjs'
import { RefreshIcon, SparkleIcon } from './icons.tsx'

type DarkroomRevealProps = {
  slides: MemoirSlide[]
  onToast?: (message: string) => void
}

const GRID_COLS = 16
const GRID_ROWS = 20
const TOTAL_CELLS = GRID_COLS * GRID_ROWS
const REVEAL_THRESHOLD = 0.52

function paintEmulsion(canvas: HTMLCanvasElement, index: number, total: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, width, height)

  // Warm darkroom chemical bath coat
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#2a1210')
  grad.addColorStop(0.5, '#1d1414')
  grad.addColorStop(1, '#311a14')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // Subtle amber safelight glow in the middle
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.45, width * 0.65)
  glow.addColorStop(0, 'rgba(232, 156, 84, 0.24)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // Minimal analog markings
  ctx.strokeStyle = 'rgba(244, 214, 181, 0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(18, 18, width - 36, height - 36)

  ctx.fillStyle = 'rgba(244, 214, 181, 0.78)'
  ctx.font = '700 15px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`FRAME ${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, width / 2, height * 0.44)

  ctx.fillStyle = 'rgba(244, 214, 181, 0.92)'
  ctx.font = 'italic 22px Georgia, serif'
  ctx.fillText('Rub to develop print', width / 2, height * 0.52)
}

const DarkroomPrintCard = memo(function DarkroomPrintCard({
  slide,
  forceDeveloped,
  onDeveloped,
}: {
  slide: MemoirSlide
  forceDeveloped: boolean
  onDeveloped: (index: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellsRef = useRef<Uint8Array>(new Uint8Array(TOTAL_CELLS))
  const clearedCountRef = useRef(0)
  const drawingRef = useRef(false)
  const [percent, setPercent] = useState(0)
  const [developed, setDeveloped] = useState(false)
  const [justDeveloped, setJustDeveloped] = useState(false)

  const isDeveloped = forceDeveloped || developed
  const displayPercent = isDeveloped ? 100 : percent
  const showFlash = justDeveloped || forceDeveloped

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      paintEmulsion(canvas, slide.index, slide.count)
    }
  }, [slide.count, slide.index])

  const triggerFullReveal = useCallback(() => {
    setDeveloped(true)
    setJustDeveloped(true)
    setPercent(100)
    onDeveloped(slide.index)
  }, [onDeveloped, slide.index])

  function washAt(clientX: number, clientY: number) {
    if (isDeveloped) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const normX = (clientX - rect.left) / rect.width
    const normY = (clientY - rect.top) / rect.height
    const x = normX * canvas.width
    const y = normY * canvas.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const brushRadius = Math.max(36, canvas.width * 0.14)
    ctx.globalCompositeOperation = 'destination-out'
    const brush = ctx.createRadialGradient(x, y, brushRadius * 0.25, x, y, brushRadius)
    brush.addColorStop(0, 'rgba(0,0,0,1)')
    brush.addColorStop(0.65, 'rgba(0,0,0,0.85)')
    brush.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = brush
    ctx.beginPath()
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2)
    ctx.fill()

    // Fast O(1) cell-grid coverage tracking (no getImageData overhead!)
    const colCenter = Math.floor(normX * GRID_COLS)
    const rowCenter = Math.floor(normY * GRID_ROWS)
    const cellRadius = 2
    for (let dy = -cellRadius; dy <= cellRadius; dy += 1) {
      for (let dx = -cellRadius; dx <= cellRadius; dx += 1) {
        if (dx * dx + dy * dy > cellRadius * cellRadius + 1) continue
        const c = colCenter + dx
        const r = rowCenter + dy
        if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) continue
        const idx = r * GRID_COLS + c
        if (cellsRef.current[idx] === 0) {
          cellsRef.current[idx] = 1
          clearedCountRef.current += 1
        }
      }
    }

    const ratio = clearedCountRef.current / TOTAL_CELLS
    const pct = Math.min(100, Math.round((ratio / REVEAL_THRESHOLD) * 100))
    setPercent(pct)
    if (ratio >= REVEAL_THRESHOLD) {
      triggerFullReveal()
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (isDeveloped) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    washAt(event.clientX, event.clientY)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || isDeveloped) return
    washAt(event.clientX, event.clientY)
  }

  function handlePointerEnd() {
    drawingRef.current = false
  }

  return (
    <article className="darkroom-print">
      <div
        className={`darkroom-frame${isDeveloped ? ' is-developed' : ''}${showFlash ? ' is-just-developed' : ''}`}
      >
        <img className="darkroom-photo" src={slide.asset.dataUrl} alt={slide.rawCaption} decoding="async" />
        <canvas
          ref={canvasRef}
          className="darkroom-canvas"
          width={360}
          height={450}
          aria-label={`Rub to develop frame ${slide.index}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
        <div className="darkroom-flash" aria-hidden="true" />
        <span className="darkroom-progress-pill">
          {isDeveloped ? `DEVELOPED · ${String(slide.index).padStart(2, '0')}` : `${displayPercent}% DEVELOPED`}
        </span>
      </div>

      <div className={isDeveloped ? 'darkroom-caption-reveal is-revealed' : 'darkroom-caption-reveal'}>
        <h4>{slide.rawCaption}</h4>
        <p>{slide.rawBody}</p>
      </div>
    </article>
  )
})

export function DarkroomReveal({ slides, onToast }: DarkroomRevealProps) {
  const [forceDeveloped, setForceDeveloped] = useState(false)
  const [resetSeed, setResetSeed] = useState(0)
  const [developedSet, setDevelopedSet] = useState<Set<number>>(() => new Set())

  const handleSingleDeveloped = useCallback(
    (index: number) => {
      setDevelopedSet((current) => {
        if (current.has(index)) return current
        const next = new Set(current)
        next.add(index)
        if (next.size === slides.length) {
          onToast?.('Entire roll developed')
        }
        return next
      })
    },
    [onToast, slides.length],
  )

  function handleDevelopAll() {
    setForceDeveloped(true)
    setDevelopedSet(new Set(slides.map((slide) => slide.index)))
    onToast?.('Flash-developed all frames')
  }

  function handleReset() {
    setForceDeveloped(false)
    setDevelopedSet(new Set())
    setResetSeed((seed) => seed + 1)
  }

  return (
    <section className="darkroom-stage" aria-label="Darkroom developing tray">
      <div className="darkroom-header">
        <div>
          <p className="eyebrow">Safelight tray · {developedSet.size}/{slides.length} revealed</p>
          <h3>Brush across each print to develop the story</h3>
        </div>
        <div className="darkroom-controls">
          <button type="button" className="darkroom-button" onClick={handleDevelopAll}>
            <SparkleIcon />
            <span>Flash develop all</span>
          </button>
          <button type="button" className="darkroom-button" onClick={handleReset}>
            <RefreshIcon />
            <span>Reset roll</span>
          </button>
        </div>
      </div>

      <div className="darkroom-grid">
        {slides.map((slide) => (
          <DarkroomPrintCard
            key={`${slide.id}-${resetSeed}`}
            slide={slide}
            forceDeveloped={forceDeveloped}
            onDeveloped={handleSingleDeveloped}
          />
        ))}
      </div>
    </section>
  )
}
