import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildMemoirSlides, type MemoirSlide } from '../../../../packages/memoir-core/index.mjs'
import { extractDayPalette, hexToRgba, type PhotoPalette } from '../palette.ts'
import { MemoirSoundscape } from '../soundscape.ts'
import type { Memoir } from '../types.ts'
import { DarkroomReveal } from './DarkroomReveal.tsx'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  DownloadIcon,
  EditIcon,
  FlipIcon,
  PlayIcon,
  SaveIcon,
  SparkleIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
} from './icons.tsx'

const CinemaPlayer = lazy(() => import('./CinemaPlayer.tsx').then((mod) => ({ default: mod.CinemaPlayer })))

type ReaderMode = 'spread' | 'darkroom'

type ReaderScreenProps = {
  draft: Memoir
  autoOpenCinema?: boolean
  defaultDarkroom?: boolean
  onClearAutoCinema?: () => void
  onArchive: () => void
  onEdit: () => void
  onSave: () => void
  onShare: () => void
  onAmbientChange?: (ambientA: string, ambientB: string) => void
  onToast?: (message: string) => void
}

const FlipSlideCard = memo(function FlipSlideCard({
  slide,
  isFlipped,
  palette,
  musicCue,
  soundOn,
  dateLabel,
  onToggleFlip,
  onCopyHex,
}: {
  slide: MemoirSlide
  isFlipped: boolean
  palette: PhotoPalette | undefined
  musicCue: string
  soundOn: boolean
  dateLabel: string
  onToggleFlip: (slideId: string) => void
  onCopyHex: (hex: string) => void
}) {
  return (
    <article className="reader-slide" data-slide-index={slide.index - 1}>
      <div className={isFlipped ? 'flip-card is-flipped' : 'flip-card'}>
        <div className="flip-face flip-front">
          <div className="print-rebate-bar">
            <span>◀ EXP {String(slide.index).padStart(2, '0')}A</span>
            <span>{String(slide.index).padStart(2, '0')} / {String(slide.count).padStart(2, '0')} · {slide.tone}</span>
          </div>
          <div
            className="reader-slide-media"
            onClick={() => onToggleFlip(slide.id)}
            title="Tap to flip print for hidden back note"
          >
            <img src={slide.asset.dataUrl} alt={slide.rawCaption} decoding="async" />
            <button
              type="button"
              className="flip-trigger-badge"
              onClick={(event) => {
                event.stopPropagation()
                onToggleFlip(slide.id)
              }}
              aria-label={`Flip print ${slide.index} to read back note`}
            >
              <FlipIcon />
              <span>Flip print</span>
            </button>
          </div>
          <div className="reader-slide-copy">
            <h3>{slide.rawCaption}</h3>
            <p>{slide.rawBody}</p>
          </div>
        </div>

        <div className="flip-face flip-back" aria-hidden={!isFlipped}>
          <div className="flip-back-header">
            <span className="flip-stamp">
              EXP {String(slide.index).padStart(2, '0')}A · {slide.tone}
            </span>
            <button
              type="button"
              className="pill-button"
              onClick={() => onToggleFlip(slide.id)}
              aria-label={`Flip print ${slide.index} back to photo`}
            >
              <FlipIcon />
              <span>Photo</span>
            </button>
          </div>

          <div className="flip-back-body">
            <p className="eyebrow">{dateLabel}</p>
            <h3>“{slide.rawCaption}”</h3>
            <p>{slide.rawBody}</p>
          </div>

          <div className="flip-back-footer">
            {palette ? (
              <div className="color-dna-swatches" aria-label={`Color DNA for frame ${slide.index}`}>
                {palette.swatches.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className="swatch-chip"
                    onClick={() => onCopyHex(hex)}
                    title={`Copy ${hex}`}
                  >
                    <span className="swatch-dot" style={{ backgroundColor: hex }} />
                    <span>{hex.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {musicCue ? (
              <span className="music-vinyl-pill">
                <span className={soundOn ? 'vinyl-disc is-spinning' : 'vinyl-disc'} aria-hidden="true" />
                <span>{musicCue}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
})

export function ReaderScreen({
  draft,
  autoOpenCinema = false,
  defaultDarkroom = false,
  onClearAutoCinema,
  onArchive,
  onEdit,
  onSave,
  onShare,
  onAmbientChange,
  onToast,
}: ReaderScreenProps) {
  const slides = useMemo(() => buildMemoirSlides(draft), [draft])
  const trackRef = useRef<HTMLDivElement>(null)
  const soundscapeRef = useRef<MemoirSoundscape | null>(null)
  const [mode, setMode] = useState<ReaderMode>(defaultDarkroom ? 'darkroom' : 'spread')
  const [cinemaOpen, setCinemaOpen] = useState(false)
  const isCinemaVisible = cinemaOpen || autoOpenCinema
  const closeCinema = useCallback(() => {
    setCinemaOpen(false)
    onClearAutoCinema?.()
  }, [onClearAutoCinema])
  const [activeIndex, setActiveIndex] = useState(0)
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set())
  const [soundOn, setSoundOn] = useState(false)
  const [perAssetPalette, setPerAssetPalette] = useState<Map<string, PhotoPalette>>(() => new Map())
  const [daySwatches, setDaySwatches] = useState<string[]>([])

  const dateLabel = useMemo(
    () => new Date(draft.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    [draft.createdAt],
  )

  useEffect(() => {
    let cancelled = false
    void extractDayPalette(draft.assets).then(({ perAsset, day }) => {
      if (cancelled) return
      setPerAssetPalette(perAsset)
      setDaySwatches(day.swatches)
      onAmbientChange?.(hexToRgba(day.ambientA, 0.16), hexToRgba(day.ambientB, 0.14))
    })
    return () => {
      cancelled = true
    }
  }, [draft.assets, onAmbientChange])

  // Shift subtle ambient aura as the active photo changes
  useEffect(() => {
    const activeSlide = slides[activeIndex]
    if (!activeSlide) return
    const palette = perAssetPalette.get(activeSlide.asset.id)
    if (palette) {
      onAmbientChange?.(hexToRgba(palette.accent, 0.18), hexToRgba(palette.dominant, 0.14))
    }
  }, [activeIndex, onAmbientChange, perAssetPalette, slides])

  // Track which slide is currently centered with IntersectionObserver (zero scroll-handler jank)
  useEffect(() => {
    const track = trackRef.current
    if (!track || mode !== 'spread' || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1
        let bestRatio = 0
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            const raw = (entry.target as HTMLElement).dataset.slideIndex
            const parsed = Number(raw)
            if (Number.isFinite(parsed)) {
              bestRatio = entry.intersectionRatio
              bestIdx = parsed
            }
          }
        }
        if (bestIdx >= 0) {
          setActiveIndex(bestIdx)
        }
      },
      { root: track, threshold: [0.45, 0.7] },
    )

    const cards = Array.from(track.querySelectorAll('.reader-slide'))
    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [mode, slides.length])

  // Cleanup Web Audio on unmount
  useEffect(() => {
    return () => {
      soundscapeRef.current?.stop()
    }
  }, [])

  const toggleSound = useCallback(() => {
    if (!soundscapeRef.current) {
      soundscapeRef.current = new MemoirSoundscape()
    }
    if (soundOn) {
      soundscapeRef.current.stop()
      setSoundOn(false)
    } else {
      const started = soundscapeRef.current.start(draft.tone)
      setSoundOn(started)
      if (started) {
        onToast?.(`Playing ${draft.tone} ambient soundscape`)
      }
    }
  }, [draft.tone, onToast, soundOn])

  const toggleFlip = useCallback((slideId: string) => {
    setFlippedIds((current) => {
      const next = new Set(current)
      if (next.has(slideId)) {
        next.delete(slideId)
      } else {
        next.add(slideId)
      }
      return next
    })
  }, [])

  const scrollToSlide = useCallback((index: number) => {
    const clamped = Math.min(Math.max(0, index), slides.length - 1)
    setActiveIndex(clamped)
    const track = trackRef.current
    const target = track?.querySelector<HTMLElement>(`[data-slide-index="${clamped}"]`)
    target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [slides.length])

  // Keyboard shortcuts when reading in Spread mode
  useEffect(() => {
    if (isCinemaVisible) return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (mode === 'spread' && event.key === 'ArrowRight') {
        scrollToSlide(activeIndex + 1)
      } else if (mode === 'spread' && event.key === 'ArrowLeft') {
        scrollToSlide(activeIndex - 1)
      } else if (mode === 'spread' && event.key === ' ') {
        const activeSlide = slides[activeIndex]
        if (activeSlide) {
          event.preventDefault()
          toggleFlip(activeSlide.id)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, isCinemaVisible, mode, scrollToSlide, slides, toggleFlip])

  const copyHex = useCallback(
    (hex: string) => {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(hex).catch(() => {})
      }
      onToast?.(`Copied ${hex.toUpperCase()}`)
    },
    [onToast],
  )

  return (
    <section className="screen reader-screen">
      <div className="reader-toolbar">
        <button type="button" className="soft-button compact-button" onClick={onArchive}>
          <ArrowLeftIcon />
          <span>Archive</span>
        </button>

        <div className="reader-mode-tabs" role="group" aria-label="Reader experience mode">
          <button
            type="button"
            aria-pressed={mode === 'spread'}
            onClick={() => setMode('spread')}
          >
            <BookOpenIcon />
            <span>Spread</span>
          </button>
          <button
            type="button"
            aria-pressed={mode === 'darkroom'}
            onClick={() => setMode('darkroom')}
          >
            <SparkleIcon />
            <span>Darkroom</span>
          </button>
          <button
            type="button"
            aria-pressed={isCinemaVisible}
            onClick={() => setCinemaOpen(true)}
          >
            <PlayIcon />
            <span>Cinema</span>
          </button>
        </div>

        <div className="reader-toolbar-group">
          <button
            type="button"
            className={soundOn ? 'pill-button is-active' : 'pill-button'}
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute ambient sound' : 'Play ambient sound'}
            title="Procedural ambient soundscape"
          >
            {soundOn ? <VolumeHighIcon /> : <VolumeMuteIcon />}
            <span>{soundOn ? 'Sound' : 'Audio'}</span>
          </button>
          <button type="button" className="soft-button compact-button" onClick={onEdit}>
            <EditIcon />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <section className="reader-cover">
        <div className="reader-cover-top">
          <p className="eyebrow">
            {dateLabel} · {draft.tone} · {slides.length} frames
          </p>
          {draft.musicCue ? (
            <span className="music-vinyl-pill">
              <span className={soundOn ? 'vinyl-disc is-spinning' : 'vinyl-disc'} aria-hidden="true" />
              <span>{draft.musicCue}</span>
            </span>
          ) : null}
        </div>
        <h2>{draft.title}</h2>
        <p>{draft.summary}</p>
        {draft.quote ? <blockquote className="reader-quote-ribbon">“{draft.quote}”</blockquote> : null}
      </section>

      {daySwatches.length > 0 ? (
        <div className="color-dna-bar" aria-label="Memoir color palette">
          <div className="color-dna-head">
            <span className="color-dna-label">Pigment Strip · Color DNA</span>
            <span className="color-dna-label">Click swatch to copy</span>
          </div>
          <div className="color-dna-swatches">
            {daySwatches.map((hex) => (
              <button
                key={hex}
                type="button"
                className="swatch-chip"
                onClick={() => copyHex(hex)}
                title={`Copy ${hex}`}
              >
                <span className="swatch-dot" style={{ backgroundColor: hex }} />
                <span>{hex.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'darkroom' ? (
        <DarkroomReveal slides={slides} onToast={onToast} />
      ) : (
        <>
          <div className="reader-deck-controls">
            <div className="reader-dots" aria-label="Jump to frame">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  className={idx === activeIndex ? 'reader-dot is-active' : 'reader-dot'}
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Frame ${idx + 1}`}
                />
              ))}
            </div>
            <div className="reader-toolbar-group">
              <button
                type="button"
                className="icon-button"
                onClick={() => scrollToSlide(activeIndex - 1)}
                disabled={activeIndex <= 0}
                aria-label="Previous print"
              >
                <ArrowLeftIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => scrollToSlide(activeIndex + 1)}
                disabled={activeIndex >= slides.length - 1}
                aria-label="Next print"
              >
                <ArrowRightIcon />
              </button>
            </div>
          </div>

          <div ref={trackRef} className="reader-track" aria-label={`${slides.length} memoir carousel slides`}>
            {slides.map((slide) => (
              <FlipSlideCard
                key={slide.id}
                slide={slide}
                isFlipped={flippedIds.has(slide.id)}
                palette={perAssetPalette.get(slide.asset.id)}
                musicCue={draft.musicCue}
                soundOn={soundOn}
                dateLabel={dateLabel}
                onToggleFlip={toggleFlip}
                onCopyHex={copyHex}
              />
            ))}
          </div>
        </>
      )}

      <div className="reader-actions">
        <button type="button" className="primary-button" onClick={onShare}>
          <DownloadIcon />
          <span>Share &amp; export</span>
        </button>
        <button type="button" className="soft-button" onClick={onSave}>
          <SaveIcon />
          <span>Save to archive</span>
        </button>
      </div>

      {isCinemaVisible ? (
        <Suspense fallback={null}>
          <CinemaPlayer
            memoir={draft}
            slides={slides}
            initialIndex={activeIndex}
            soundOn={soundOn}
            onToggleSound={toggleSound}
            onClose={closeCinema}
          />
        </Suspense>
      ) : null}
    </section>
  )
}
