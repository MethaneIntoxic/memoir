import type { Asset, GenerateMemoirPayload, Memoir } from './types.ts'

export function createSampleAssets(): Asset[] {
  return [
    {
      id: 'asset-1',
      name: 'frame-1.jpg',
      dataUrl: 'data:image/jpeg;base64,aaaa',
      width: 1200,
      height: 900,
    },
    {
      id: 'asset-2',
      name: 'frame-2.jpg',
      dataUrl: 'data:image/jpeg;base64,bbbb',
      width: 1200,
      height: 900,
    },
    {
      id: 'asset-3',
      name: 'frame-3.jpg',
      dataUrl: 'data:image/jpeg;base64,cccc',
      width: 1200,
      height: 900,
    },
  ]
}

export function createSampleGeneratePayload(): GenerateMemoirPayload {
  return {
    title: 'Train Window Keepsake',
    summary: 'A grounded draft assembled from a handful of quiet frames.',
    quote: 'Some scenes linger because they never asked to be dramatic.',
    sections: [
      {
        id: 'section-1',
        assetId: 'asset-1',
        caption: 'The platform light felt almost theatrical.',
        body: 'The first frame keeps the station close, without inventing anything beyond the hush already inside it.',
      },
      {
        id: 'section-2',
        assetId: 'asset-2',
        caption: 'A reflection softened the carriage into something private.',
        body: 'The middle image holds the in-between part of the trip, where the glass does half the storytelling for you.',
      },
      {
        id: 'section-3',
        assetId: 'asset-3',
        caption: 'The last frame lands gently instead of trying to be final.',
        body: 'The closing section stays with texture and pacing so the user can keep the facts anchored to the actual photo set.',
      },
    ],
    diagnostics: {
      backend: 'ollama',
      model: 'gemma4:e2b',
      reason: 'live-model',
      stage: 'finalize',
      generatedAt: '2026-04-25T12:00:00.000Z',
      available: true,
      modelInstalled: true,
      assetCount: 3,
    },
  }
}

export function createSampleMemoir(): Memoir {
  const assets = createSampleAssets()
  const payload = createSampleGeneratePayload()

  return {
    id: 'memoir-1',
    createdAt: '2026-04-25T12:00:00.000Z',
    updatedAt: '2026-04-25T12:00:00.000Z',
    title: payload.title,
    summary: payload.summary,
    quote: payload.quote,
    tone: 'romantic',
    theme: 'noir-journal',
    notes: 'Late sunlight, a train window, and the parting quiet after a long day.',
    musicCue: 'Station piano',
    assets,
    sections: payload.sections,
    diagnostics: payload.diagnostics,
  }
}