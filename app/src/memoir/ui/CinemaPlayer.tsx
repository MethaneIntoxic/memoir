import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MemoirSlide } from '../../../../packages/memoir-core/index.mjs'
import type { Memoir } from '../types.ts'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
  XIcon,
} from './icons.tsx'

type CinemaPlayerProps = {
  memoir: Memoir
  slides: MemoirSlide[]
  initialIndex?: number
  soundOn: boolean
  onToggleSound: () => void
  onClose: () => void
}

const SPEED_OPTIONS = [0.75, 1, 1.35] as const

export function CinemaPlayer({
  memoir,
  slides,
  initialIndex = 0,
  soundOn,
  onToggleSound,
  onClose,
}: CinemaPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, slides.length - 1)))
  const [isPlaying, setIsPlaying] = useState(true)
  const [speedIdx, setSpeedIdx] = useState(1)
  const [elapsedRatio, setElapsedRatio] = useState(0)

  const speed = SPEED_OPTIONS[speedIdx] ?? 1
  const slideDurationMs = Math.round(5600 / speed)
  const activeSlide = slides[currentIndex] ?? slides[0]

  const goToIndex = (nextIndex: number) => {
    setElapsedRatio(0)
    setCurrentIndex(nextIndex)
  }

  useEffect(() => {
    if (!isPlaying || !slides.length) {
      return
    }

    let rafId = 0
    let lastTime = performance.now()
    let accumulated = elapsedRatio * slideDurationMs

    const tick = (now: number) => {
      const delta = now - lastTime
      lastTime = now
      accumulated += delta
      const nextRatio = Math.min(1, accumulated / slideDurationMs)

      if (nextRatio >= 1) {
        setElapsedRatio(0)
        setCurrentIndex((idx) => (idx + 1) % slides.length)
        return
      }
      setElapsedRatio(nextRatio)
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId)
    // Intentionally drive RAF loop by slide change, play toggle, and speed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isPlaying, slideDurationMs, slides.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === ' ') {
        event.preventDefault()
        setIsPlaying((playing) => !playing)
      } else if (event.key === 'ArrowRight') {
        setElapsedRatio(0)
        setCurrentIndex((idx) => (idx + 1) % slides.length)
      } else if (event.key === 'ArrowLeft') {
        setElapsedRatio(0)
        setCurrentIndex((idx) => (idx - 1 + slides.length) % slides.length)
      } else if (event.key.toLowerCase() === 'm') {
        onToggleSound()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onToggleSound, slides.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!activeSlide) {
    return null
  }

  const content = (
    <div className="cinema-overlay" role="dialog" aria-modal="true" aria-label={`Cinema reel for ${memoir.title}`}>
      <header className="cinema-hud-top">
        <div className="cinema-progress-segments" aria-label="Chapter progress">
          {slides.map((slide, idx) => {
            const scale = idx < currentIndex ? 1 : idx === currentIndex ? elapsedRatio : 0
            return (
              <button
                key={slide.id}
                type="button"
                className="cinema-segment"
                onClick={() => goToIndex(idx)}
                aria-label={`Jump to chapter ${idx + 1}`}
              >
                <div className="cinema-segment-fill" style={{ transform: `scaleX(${scale})` }} />
              </button>
            )
          })}
        </div>

        <div className="cinema-meta-bar">
          <span className="cinema-roll-label">
            {memoir.title} · {String(currentIndex + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')} · {memoir.tone}
          </span>
          <button type="button" className="cinema-btn" onClick={onClose} aria-label="Close cinema player">
            <XIcon />
            <span>Close</span>
          </button>
        </div>
      </header>

      <div className="cinema-stage">
        <img
          key={activeSlide.id}
          className={isPlaying ? 'cinema-photo' : 'cinema-photo is-paused'}
          src={activeSlide.asset.dataUrl}
          alt={activeSlide.rawCaption}
        />
        <div className="cinema-scrim" aria-hidden="true" />
        <div className="cinema-tap-zones">
          <button
            type="button"
            aria-label="Previous chapter"
            onClick={() => goToIndex((currentIndex - 1 + slides.length) % slides.length)}
          />
          <button
            type="button"
            aria-label="Next chapter"
            onClick={() => goToIndex((currentIndex + 1) % slides.length)}
          />
        </div>

        <div key={`sub-${activeSlide.id}`} className="cinema-subtitles">
          <h3>{activeSlide.rawCaption}</h3>
          <p>{activeSlide.rawBody}</p>
        </div>
      </div>

      <footer className="cinema-controls">
        <button
          type="button"
          className="cinema-btn"
          onClick={() => goToIndex((currentIndex - 1 + slides.length) % slides.length)}
          aria-label="Previous chapter"
        >
          <ArrowLeftIcon />
        </button>

        <button
          type="button"
          className="cinema-btn"
          onClick={() => setIsPlaying((playing) => !playing)}
          aria-label={isPlaying ? 'Pause reel' : 'Play reel'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          type="button"
          className="cinema-btn"
          onClick={() => goToIndex((currentIndex + 1) % slides.length)}
          aria-label="Next chapter"
        >
          <ArrowRightIcon />
        </button>

        <button
          type="button"
          className="cinema-btn"
          onClick={() => setSpeedIdx((idx) => (idx + 1) % SPEED_OPTIONS.length)}
          aria-label="Change playback speed"
        >
          <span>{speed}×</span>
        </button>

        <button
          type="button"
          className="cinema-btn"
          onClick={onToggleSound}
          aria-label={soundOn ? 'Mute ambient soundscape' : 'Play ambient soundscape'}
        >
          {soundOn ? <VolumeHighIcon /> : <VolumeMuteIcon />}
          <span>{soundOn ? 'Sound on' : 'Ambient sound'}</span>
        </button>
      </footer>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}
