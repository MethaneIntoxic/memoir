import assert from 'node:assert/strict'
import test from 'node:test'
import { startComposeGeneration, type ComposeGenerationProgress } from './generation.ts'
import { createSampleAssets, createSampleGeneratePayload } from './test-fixtures.ts'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('startComposeGeneration polls the job endpoint until the memoir draft is ready', async () => {
  const progressUpdates: ComposeGenerationProgress[] = []
  const payload = createSampleGeneratePayload()
  let pollCount = 0

  const result = await startComposeGeneration({
    apiBase: 'http://localhost:8787/api',
    assets: createSampleAssets(),
    tone: 'romantic',
    notes: 'Late sunlight and the quiet after goodbye.',
    musicCue: 'Station piano',
    onProgress(progress) {
      progressUpdates.push(progress)
    },
    wait: async () => {},
    fetchImpl: async (input) => {
      const url = String(input)

      if (url.endsWith('/generation-jobs')) {
        return jsonResponse({
          jobId: 'job-1',
          status: 'queued',
          stage: 'queued',
          progressPct: 6,
          pollPath: '/api/generation-jobs/job-1',
        })
      }

      pollCount += 1

      if (pollCount === 1) {
        return jsonResponse({
          jobId: 'job-1',
          status: 'running',
          stage: 'asset-analysis',
          progressPct: 24,
        })
      }

      return jsonResponse({
        jobId: 'job-1',
        status: 'completed',
          stage: 'memoir-draft',
        progressPct: 100,
        result: payload,
      })
    },
  })

  assert.equal(result.title, payload.title)
  assert.deepEqual(
    progressUpdates.map((entry) => entry.stage),
    ['queued', 'queued', 'asset-analysis', 'memoir-draft'],
  )
  assert.equal(progressUpdates.at(-1)?.status, 'completed')
})

test('startComposeGeneration falls back to the legacy direct endpoint when jobs are unavailable', async () => {
  const progressUpdates: ComposeGenerationProgress[] = []
  const payload = createSampleGeneratePayload()
  const calledUrls: string[] = []

  const result = await startComposeGeneration({
    apiBase: 'http://localhost:8787/api',
    assets: createSampleAssets(),
    tone: 'diary',
    notes: 'A carriage reflection and a careful ending.',
    musicCue: 'Night train',
    onProgress(progress) {
      progressUpdates.push(progress)
    },
    fetchImpl: async (input) => {
      const url = String(input)
      calledUrls.push(url)

      if (url.endsWith('/generation-jobs')) {
        return new Response('', { status: 404 })
      }

      return jsonResponse(payload)
    },
  })

  assert.equal(result.summary, payload.summary)
  assert.deepEqual(calledUrls, ['http://localhost:8787/api/generation-jobs', 'http://localhost:8787/api/generate'])
  assert.equal(progressUpdates.some((entry) => entry.mode === 'legacy-direct' && entry.stage === 'legacy-direct'), true)
  assert.equal(progressUpdates.at(-1)?.status, 'completed')
})

test('startComposeGeneration cancels a server job when polling is aborted', async () => {
  const controller = new AbortController()
  const calledUrls: string[] = []

  await assert.rejects(
    () =>
      startComposeGeneration({
        apiBase: 'http://localhost:8787/api',
        assets: createSampleAssets(),
        tone: 'romantic',
        notes: 'Late sunlight and the quiet after goodbye.',
        musicCue: 'Station piano',
        signal: controller.signal,
        wait: async () => {
          controller.abort()
          throw new DOMException('Aborted', 'AbortError')
        },
        fetchImpl: async (input, init) => {
          const url = String(input)
          calledUrls.push(`${init?.method || 'GET'} ${url}`)

          if (url.endsWith('/generation-jobs')) {
            return jsonResponse({
              jobId: 'job-1',
              status: 'running',
              stage: 'asset-analysis',
              progressPct: 24,
              pollPath: '/api/generation-jobs/job-1',
            })
          }

          return jsonResponse({ ok: true, job: { id: 'job-1', status: 'cancelled' } })
        },
      }),
    /Aborted/,
  )

  assert.deepEqual(calledUrls, [
    'POST http://localhost:8787/api/generation-jobs',
    'POST http://localhost:8787/api/generation-jobs/job-1/cancel',
  ])
})

test('startComposeGeneration uses the Android native bridge when available', async () => {
  const calls: unknown[] = []
  const payload = createSampleGeneratePayload()

  const result = await startComposeGeneration({
    apiBase: '/api',
    assets: createSampleAssets(),
    tone: 'romantic',
    notes: 'bridge note',
    musicCue: 'bridge cue',
    androidAiBridge: {
      health: async () => ({ available: true }),
      generateMemoir: async (request) => {
        calls.push(request)
        return payload
      },
      cancelGeneration: async () => ({ cancelled: true }),
    },
    fetchImpl: async () => {
      throw new Error('fetch should not be used')
    },
  })

  assert.equal(result.title, payload.title)
  assert.equal(calls.length, 1)
  assert.equal((calls[0] as { tone: string }).tone, 'romantic')
})
