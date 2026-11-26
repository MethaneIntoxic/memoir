import type { Asset, Memoir } from './types.ts'

type SceneSpec = {
  id: string
  name: string
  caption: string
  body: string
  skyTop: string
  skyMid: string
  skyLow: string
  glowColor: string
  accentColor: string
  silhouetteColor: string
  motif: 'harbor' | 'alley' | 'train' | 'rooftop' | 'coast'
}

const SAMPLE_SCENES: SceneSpec[] = [
  {
    id: 'sample-harbor',
    name: 'golden-harbor.jpg',
    caption: 'We caught the 6:14 ferry before the sky turned copper',
    body: 'Nobody checked the timetable twice. Salt wind tangled in our sleeves, and the whole week loosened its grip the second the pier slipped behind the wake.',
    skyTop: '#24344d',
    skyMid: '#c46c5c',
    skyLow: '#f2c18d',
    glowColor: '#ffd9a0',
    accentColor: '#ff9a62',
    silhouetteColor: '#1a2333',
    motif: 'harbor',
  },
  {
    id: 'sample-alley',
    name: 'rainy-ramen-alley.jpg',
    caption: 'Rain found us first, then the red lantern did',
    body: 'Steam fogged the counter window while umbrellas dripped by the door. Two bowls, mismatched chopsticks, and the kind of laughter that makes strangers smile at their soup.',
    skyTop: '#161b26',
    skyMid: '#3d2434',
    skyLow: '#8f3a43',
    glowColor: '#ff7058',
    accentColor: '#f4c97a',
    silhouetteColor: '#12131a',
    motif: 'alley',
  },
  {
    id: 'sample-train',
    name: 'midnight-carriage.jpg',
    caption: 'City lights smudged into watercolor across the glass',
    body: 'The last local train hummed like an old cassette tape. Half asleep against the cool window, watching neon stations drift past like postcards we never had to mail.',
    skyTop: '#141e2e',
    skyMid: '#274659',
    skyLow: '#608c99',
    glowColor: '#9ce6d5',
    accentColor: '#f2b880',
    silhouetteColor: '#0e1520',
    motif: 'train',
  },
  {
    id: 'sample-rooftop',
    name: 'rooftop-vinyl.jpg',
    caption: 'Someone found an old record and forgot to look at the clock',
    body: 'Warm string lights over concrete, cold sodas sweating on the ledge, and a breeze that smelled faintly of cedar and summer rain.',
    skyTop: '#1d1c30',
    skyMid: '#563c5c',
    skyLow: '#c27e79',
    glowColor: '#ffe09e',
    accentColor: '#e68c83',
    silhouetteColor: '#191624',
    motif: 'rooftop',
  },
  {
    id: 'sample-coast',
    name: 'first-light-walk.jpg',
    caption: 'Morning arrived quietly, like it wanted us to keep the secret',
    body: 'Shoes dusty, pockets holding two crumpled ferry tickets, walking home slow enough to let the whole night settle into memory.',
    skyTop: '#314c61',
    skyMid: '#7da19d',
    skyLow: '#e8d7be',
    glowColor: '#fff3d6',
    accentColor: '#d98e68',
    silhouetteColor: '#233542',
    motif: 'coast',
  },
]

function renderProceduralFilmFrame(scene: SceneSpec): string {
  const width = 768
  const height = 960

  if (typeof document === 'undefined') {
    return 'data:image/jpeg;base64,aaaa'
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return 'data:image/jpeg;base64,aaaa'
  }

  // Atmospheric gradient sky / backdrop
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, scene.skyTop)
  sky.addColorStop(0.55, scene.skyMid)
  sky.addColorStop(1, scene.skyLow)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  // Soft sun / lantern halo
  const haloX = scene.motif === 'alley' ? width * 0.64 : scene.motif === 'train' ? width * 0.34 : width * 0.52
  const haloY = scene.motif === 'coast' ? height * 0.44 : height * 0.48
  const halo = ctx.createRadialGradient(haloX, haloY, 16, haloX, haloY, width * 0.52)
  halo.addColorStop(0, scene.glowColor)
  halo.addColorStop(0.35, `${scene.accentColor}88`)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, width, height)

  // Scene-specific photographic silhouettes & light bokeh
  if (scene.motif === 'harbor' || scene.motif === 'coast') {
    // Distant hills
    ctx.fillStyle = `${scene.silhouetteColor}aa`
    ctx.beginPath()
    ctx.moveTo(0, height * 0.62)
    ctx.quadraticCurveTo(width * 0.28, height * 0.51, width * 0.56, height * 0.59)
    ctx.quadraticCurveTo(width * 0.82, height * 0.65, width, height * 0.55)
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // Shimmering water horizon
    const water = ctx.createLinearGradient(0, height * 0.6, 0, height)
    water.addColorStop(0, `${scene.silhouetteColor}dd`)
    water.addColorStop(1, scene.silhouetteColor)
    ctx.fillStyle = water
    ctx.fillRect(0, height * 0.62, width, height * 0.38)

    // Sun/moon reflection streaks on water
    for (let i = 0; i < 24; i += 1) {
      const y = height * 0.64 + i * 13
      const spread = 120 - i * 3.5 + Math.sin(i * 1.9) * 28
      ctx.fillStyle = i % 2 === 0 ? `${scene.glowColor}55` : `${scene.accentColor}44`
      ctx.fillRect(haloX - spread / 2, y, Math.max(16, spread), 3)
    }

    // Ferry / pier rail silhouette
    ctx.fillStyle = scene.silhouetteColor
    ctx.fillRect(0, height * 0.82, width, 16)
    ctx.fillRect(width * 0.14, height * 0.72, 12, height * 0.28)
    ctx.fillRect(width * 0.84, height * 0.72, 12, height * 0.28)
  } else if (scene.motif === 'alley') {
    // Narrow city alley walls
    ctx.fillStyle = scene.silhouetteColor
    ctx.fillRect(0, 0, width * 0.22, height)
    ctx.fillRect(width * 0.78, 0, width * 0.22, height)
    ctx.fillRect(0, height * 0.74, width, height * 0.26)

    // Glowing paper lantern
    ctx.fillStyle = scene.glowColor
    ctx.beginPath()
    ctx.ellipse(haloX, haloY, 54, 72, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#6b1d22'
    ctx.lineWidth = 4
    for (let y = haloY - 46; y <= haloY + 46; y += 22) {
      ctx.beginPath()
      ctx.moveTo(haloX - 48, y)
      ctx.lineTo(haloX + 48, y)
      ctx.stroke()
    }

    // Wet street reflections & rain streaks
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? `${scene.glowColor}38` : `${scene.accentColor}30`
      ctx.fillRect(width * 0.26 + (i * 29) % (width * 0.48), height * 0.76 + (i * 17) % 180, 44, 6)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 42; i += 1) {
      const rx = (i * 73) % width
      const ry = (i * 131) % height
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx - 10, ry + 56)
      ctx.stroke()
    }
  } else if (scene.motif === 'train') {
    // Bokeh city lights outside train window
    const bokehSpots = [
      [0.24, 0.42, 46, scene.glowColor],
      [0.39, 0.36, 30, scene.accentColor],
      [0.62, 0.48, 54, scene.accentColor],
      [0.74, 0.39, 26, scene.glowColor],
      [0.52, 0.56, 36, '#ffffff'],
      [0.31, 0.58, 22, scene.glowColor],
    ] as const
    for (const [bx, by, radius, color] of bokehSpots) {
      const g = ctx.createRadialGradient(width * bx, height * by, 2, width * bx, height * by, radius)
      g.addColorStop(0, `${color}aa`)
      g.addColorStop(0.65, `${color}33`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(width * bx, height * by, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Train window frame
    ctx.strokeStyle = scene.silhouetteColor
    ctx.lineWidth = 64
    ctx.strokeRect(20, 40, width - 40, height - 120)
    ctx.fillStyle = scene.silhouetteColor
    ctx.fillRect(0, height * 0.76, width, height * 0.24)
  } else {
    // Rooftop string lights & skyline
    ctx.fillStyle = scene.silhouetteColor
    const buildings = [
      [0, 0.64, 0.18],
      [0.16, 0.58, 0.16],
      [0.3, 0.66, 0.15],
      [0.44, 0.54, 0.19],
      [0.61, 0.62, 0.17],
      [0.76, 0.56, 0.24],
    ]
    for (const [bx, by, bw] of buildings) {
      ctx.fillRect(width * bx, height * by, width * bw, height * (1 - by))
    }

    // Draped string lights
    ctx.strokeStyle = 'rgba(255,235,190,0.45)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(0, height * 0.24)
    ctx.quadraticCurveTo(width * 0.5, height * 0.42, width, height * 0.2)
    ctx.stroke()

    for (let i = 1; i <= 7; i += 1) {
      const t = i / 8
      const lx = width * t
      const ly = (1 - t) * (1 - t) * (height * 0.24) + 2 * (1 - t) * t * (height * 0.42) + t * t * (height * 0.2)
      const bulb = ctx.createRadialGradient(lx, ly, 2, lx, ly, 36)
      bulb.addColorStop(0, '#fff9df')
      bulb.addColorStop(0.35, `${scene.glowColor}88`)
      bulb.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bulb
      ctx.beginPath()
      ctx.arc(lx, ly, 36, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Subtle warm film light-leak edge
  const leak = ctx.createLinearGradient(0, 0, width * 0.32, 0)
  leak.addColorStop(0, `${scene.accentColor}2e`)
  leak.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = leak
  ctx.fillRect(0, 0, width, height)

  // Subtle analog vignette
  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, height * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(10,8,10,0.38)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  return canvas.toDataURL('image/jpeg', 0.82)
}

export function createSampleFilmRollMemoir(): Memoir {
  const now = new Date().toISOString()
  const assets: Asset[] = SAMPLE_SCENES.map((scene) => ({
    id: scene.id,
    name: scene.name,
    dataUrl: renderProceduralFilmFrame(scene),
    width: 768,
    height: 960,
  }))

  return {
    id: `sample-roll-${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    title: 'Midnight Ferry & Rainy Ramen',
    summary: 'Five candid frames from an unplanned coastal evening that refused to end early.',
    quote: 'Some nights only make sense once the train window turns them into a blur.',
    tone: 'romantic',
    theme: 'soft-archive',
    notes: 'Caught the sunset ferry on impulse, hid from rain in a ramen shop, took the last local train back.',
    musicCue: 'Laufey — From The Start (Vinyl)',
    assets,
    sections: SAMPLE_SCENES.map((scene, index) => ({
      id: `sample-section-${index + 1}`,
      assetId: scene.id,
      caption: scene.caption,
      body: scene.body,
    })),
    diagnostics: {
      backend: 'sample-film-roll',
      model: 'curated-demo',
      reason: 'interactive-demo-roll',
      assetCount: assets.length,
    },
  }
}
