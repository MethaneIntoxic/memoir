import type { Tone } from './types.ts'

type ChordProgression = {
  tempoMs: number
  waveform: OscillatorType
  filterHz: number
  chords: number[][]
  melodyPool: number[]
}

const TONE_PROFILES: Record<Tone, ChordProgression> = {
  romantic: {
    tempoMs: 3600,
    waveform: 'triangle',
    filterHz: 920,
    // Fmaj7 -> Dm9 -> Bbmaj7 -> C6 (Hz)
    chords: [
      [174.61, 220.0, 261.63, 329.63],
      [146.83, 220.0, 261.63, 329.63],
      [116.54, 174.61, 220.0, 293.66],
      [130.81, 196.0, 220.0, 261.63],
    ],
    melodyPool: [440.0, 523.25, 587.33, 659.25, 783.99],
  },
  playful: {
    tempoMs: 2400,
    waveform: 'sine',
    filterHz: 1550,
    // Bright pentatonic Rhodes vibe: Gmaj7 -> Em7 -> Cmaj9 -> D6
    chords: [
      [196.0, 246.94, 293.66, 369.99],
      [164.81, 246.94, 293.66, 392.0],
      [130.81, 196.0, 246.94, 293.66],
      [146.83, 220.0, 246.94, 369.99],
    ],
    melodyPool: [587.33, 659.25, 739.99, 783.99, 987.77],
  },
  diary: {
    tempoMs: 4200,
    waveform: 'sine',
    filterHz: 780,
    // Intimate felt piano: Cmaj7 -> Am9 -> Fmaj7 -> G6
    chords: [
      [130.81, 196.0, 246.94, 329.63],
      [110.0, 196.0, 246.94, 261.63],
      [174.61, 220.0, 261.63, 329.63],
      [196.0, 246.94, 329.63, 392.0],
    ],
    melodyPool: [392.0, 440.0, 493.88, 523.25, 659.25],
  },
  editorial: {
    tempoMs: 4600,
    waveform: 'triangle',
    filterHz: 660,
    // Cinematic ambient fifths: Dsus2 -> Bbsus2 -> Fmaj7 -> Asus4
    chords: [
      [146.83, 220.0, 329.63, 440.0],
      [116.54, 174.61, 261.63, 349.23],
      [174.61, 261.63, 329.63, 440.0],
      [110.0, 164.81, 293.66, 329.63],
    ],
    melodyPool: [440.0, 523.25, 587.33, 659.25],
  },
}

export class MemoirSoundscape {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private timerId: number | null = null
  private step = 0
  private tone: Tone = 'romantic'
  private active = false

  isPlaying(): boolean {
    return this.active
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return typeof window.AudioContext === 'function' || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext === 'function'
  }

  start(tone: Tone): boolean {
    if (!MemoirSoundscape.isSupported()) {
      return false
    }

    this.tone = tone

    if (this.active) {
      return true
    }

    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtor()
      const master = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      filter.type = 'lowpass'
      filter.frequency.value = TONE_PROFILES[tone].filterHz
      filter.Q.value = 0.7

      master.gain.setValueAtTime(0.0001, ctx.currentTime)
      master.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 1.1)

      filter.connect(master)
      master.connect(ctx.destination)

      this.context = ctx
      this.masterGain = master
      this.filter = filter
      this.active = true
      this.step = 0

      this.startTapeTexture(ctx, master)
      this.scheduleBeat()
      return true
    } catch {
      this.stop()
      return false
    }
  }

  setTone(tone: Tone) {
    this.tone = tone
    if (this.filter && this.context) {
      this.filter.frequency.setTargetAtTime(TONE_PROFILES[tone].filterHz, this.context.currentTime, 0.4)
    }
  }

  private startTapeTexture(ctx: AudioContext, destination: GainNode) {
    try {
      const sampleRate = ctx.sampleRate
      const length = sampleRate * 2
      const buffer = ctx.createBuffer(1, length, sampleRate)
      const channel = buffer.getChannelData(0)
      let lastOut = 0

      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1
        lastOut = (lastOut + 0.03 * white) / 1.03
        const crackle = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.25 : 0
        channel[i] = lastOut * 0.08 + crackle
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.032

      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 1800

      noise.connect(bandpass)
      bandpass.connect(noiseGain)
      noiseGain.connect(destination)
      noise.start()
      this.noiseSource = noise
    } catch {
      // Optional analog texture; ignore if audio buffer fails
    }
  }

  private scheduleBeat() {
    if (!this.active || !this.context || !this.filter) {
      return
    }

    const profile = TONE_PROFILES[this.tone]
    const chord = profile.chords[this.step % profile.chords.length] ?? profile.chords[0]
    const now = this.context.currentTime
    const durationSec = profile.tempoMs / 1000

    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => {})
    }

    chord.forEach((freq, idx) => {
      this.triggerVoice(freq, now + idx * 0.09, durationSec * 0.96, 0.16 / chord.length, profile.waveform)
    })

    // Gentle melody sparkle on alternating bars
    const melodyFreq = profile.melodyPool[(this.step * 2 + 1) % profile.melodyPool.length]
    if (melodyFreq) {
      this.triggerVoice(melodyFreq, now + durationSec * 0.42, durationSec * 0.58, 0.05, 'sine')
    }

    this.step += 1
    this.timerId = window.setTimeout(() => {
      this.scheduleBeat()
    }, profile.tempoMs)
  }

  private triggerVoice(freq: number, startTime: number, duration: number, peakGain: number, waveform: OscillatorType) {
    if (!this.context || !this.filter) return

    const osc = this.context.createOscillator()
    const voiceGain = this.context.createGain()
    osc.type = waveform
    // Slight analog tape detune for warmth
    const detune = (Math.random() - 0.5) * 6
    osc.frequency.setValueAtTime(freq, startTime)
    osc.detune.setValueAtTime(detune, startTime)

    voiceGain.gain.setValueAtTime(0.0001, startTime)
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.45, duration * 0.25))
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    osc.connect(voiceGain)
    voiceGain.connect(this.filter)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.08)
  }

  stop() {
    this.active = false
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId)
      this.timerId = null
    }
    try {
      this.noiseSource?.stop()
    } catch {
      // Ignore already-stopped source
    }
    this.noiseSource = null

    if (this.masterGain && this.context) {
      try {
        const ctx = this.context
        this.masterGain.gain.cancelScheduledValues(ctx.currentTime)
        this.masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12)
        window.setTimeout(() => {
          void ctx.close().catch(() => {})
        }, 280)
      } catch {
        void this.context.close().catch(() => {})
      }
    } else if (this.context) {
      void this.context.close().catch(() => {})
    }

    this.context = null
    this.masterGain = null
    this.filter = null
  }
}
