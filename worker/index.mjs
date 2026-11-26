const VISION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'
const PRIMARY_STORY_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'
const FALLBACK_STORY_MODEL = '@cf/google/gemma-4-26b-a4b-it'

const MAX_BODY_BYTES = 10 * 1024 * 1024
const MAX_CLIENT_ASSETS = 10
const MAX_VISION_ASSETS = 10
const MAX_NOTES_LENGTH = 400
const MAX_MUSIC_CUE_LENGTH = 120
const MAX_REWRITE_TEXT_LENGTH = 500
const MAX_DATA_URL_LENGTH = Math.round(2.5 * 1024 * 1024)
const TONES = new Set(['romantic', 'playful', 'diary', 'editorial'])

// Defense-in-depth per-isolate sliding window fallback (used alongside Cloudflare native rate limit bindings)
const LOCAL_RATE_BUCKETS = new Map()
const MAX_LOCAL_TRACKED_KEYS = 2000
const RATE_LIMIT_SPECS = {
  compose: { limit: 4, windowMs: 60_000 },
  rewrite: { limit: 12, windowMs: 60_000 },
  global: { limit: 30, windowMs: 60_000 },
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      ...extraHeaders,
    },
  })
}

function getClientIp(request) {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp
  const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return xff || 'unknown'
}

function isAllowedOrigin(origin, url) {
  if (!origin) return true
  if (origin === url.origin) return true
  try {
    const parsed = new URL(origin)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function verifyApiRequestOrigin(request, url) {
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase()
  if (secFetchSite === 'cross-site') {
    return jsonResponse(
      { error: { code: 'forbidden-origin', message: 'Cross-site requests to this endpoint are not allowed.' } },
      403,
    )
  }

  const origin = request.headers.get('origin')
  if (origin && !isAllowedOrigin(origin, url)) {
    return jsonResponse(
      { error: { code: 'forbidden-origin', message: 'Requests must originate from Memoir.' } },
      403,
    )
  }

  return null
}

function checkLocalSlidingWindow(bucketKey, limit, windowMs) {
  const now = Date.now()
  const cutoff = now - windowMs

  if (LOCAL_RATE_BUCKETS.size > MAX_LOCAL_TRACKED_KEYS) {
    for (const [key, timestamps] of LOCAL_RATE_BUCKETS.entries()) {
      const fresh = timestamps.filter((ts) => ts > cutoff)
      if (fresh.length === 0) {
        LOCAL_RATE_BUCKETS.delete(key)
      } else {
        LOCAL_RATE_BUCKETS.set(key, fresh)
      }
    }
    if (LOCAL_RATE_BUCKETS.size > MAX_LOCAL_TRACKED_KEYS) {
      LOCAL_RATE_BUCKETS.clear()
    }
  }

  const existing = (LOCAL_RATE_BUCKETS.get(bucketKey) || []).filter((ts) => ts > cutoff)
  if (existing.length >= limit) {
    LOCAL_RATE_BUCKETS.set(bucketKey, existing)
    return false
  }

  existing.push(now)
  LOCAL_RATE_BUCKETS.set(bucketKey, existing)
  return true
}

async function enforceRateLimit(request, env, kind) {
  const ip = getClientIp(request)
  const spec = RATE_LIMIT_SPECS[kind] || RATE_LIMIT_SPECS.compose
  const binding = kind === 'rewrite' ? env.REWRITE_LIMITER : env.COMPOSE_LIMITER

  // 1. Per-IP edge rate limit (native Cloudflare binding + isolate fallback)
  let ipAllowed = true
  if (binding && typeof binding.limit === 'function') {
    try {
      const outcome = await binding.limit({ key: `${kind}:${ip}` })
      ipAllowed = outcome?.success !== false
    } catch {
      ipAllowed = checkLocalSlidingWindow(`${kind}:${ip}`, spec.limit, spec.windowMs)
    }
  } else {
    ipAllowed = checkLocalSlidingWindow(`${kind}:${ip}`, spec.limit, spec.windowMs)
  }

  if (!ipAllowed) {
    const message =
      kind === 'rewrite'
        ? 'You are polishing lines quickly — wait a moment before rewriting again.'
        : 'Easy on the shutter — you can develop up to 4 memoirs per minute. Wait a moment and try again.'
    return jsonResponse(
      { error: { code: 'rate-limited', message }, retryAfterSeconds: 60 },
      429,
      { 'Retry-After': '60' },
    )
  }

  // 2. Global per-PoP burst circuit breaker (mitigates distributed botnet floods)
  let globalAllowed = true
  if (env.GLOBAL_AI_LIMITER && typeof env.GLOBAL_AI_LIMITER.limit === 'function') {
    try {
      const outcome = await env.GLOBAL_AI_LIMITER.limit({ key: 'global-ai-burst' })
      globalAllowed = outcome?.success !== false
    } catch {
      globalAllowed = checkLocalSlidingWindow('global-ai-burst', RATE_LIMIT_SPECS.global.limit, RATE_LIMIT_SPECS.global.windowMs)
    }
  } else {
    globalAllowed = checkLocalSlidingWindow('global-ai-burst', RATE_LIMIT_SPECS.global.limit, RATE_LIMIT_SPECS.global.windowMs)
  }

  if (!globalAllowed) {
    return jsonResponse(
      {
        error: {
          code: 'darkroom-busy',
          message: 'The darkroom is packed right now. Wait a few seconds and tap develop again.',
        },
        retryAfterSeconds: 30,
      },
      429,
      { 'Retry-After': '30' },
    )
  }

  return null
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function normalizeTone(value) {
  const tone = cleanText(value, 32).toLowerCase()
  return TONES.has(tone) ? tone : 'romantic'
}

function sanitizeDataUrl(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_DATA_URL_LENGTH) return ''
  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i)
  if (!match) return ''
  return `data:${match[1].toLowerCase()};base64,${match[2].replace(/\s+/g, '')}`
}

function sanitizeAssets(input) {
  if (!Array.isArray(input)) return { assets: [], inputWarnings: [] }
  const inputWarnings = []
  if (input.length > MAX_CLIENT_ASSETS) {
    inputWarnings.push(`only-first-${MAX_CLIENT_ASSETS}-assets-used`)
  }
  const assets = input
    .slice(0, MAX_CLIENT_ASSETS)
    .map((asset, index) => {
      if (!asset || typeof asset !== 'object' || Array.isArray(asset)) return null
      const id = cleanText(String(asset.id || `asset-${index + 1}`), 80) || `asset-${index + 1}`
      const dataUrl = sanitizeDataUrl(asset.dataUrl)
      if (!dataUrl) return null
      return { id, dataUrl }
    })
    .filter(Boolean)

  if (assets.length < Math.min(input.length, MAX_CLIENT_ASSETS)) {
    inputWarnings.push('invalid-assets-dropped')
  }
  if (assets.length > MAX_VISION_ASSETS) {
    inputWarnings.push(`only-first-${MAX_VISION_ASSETS}-assets-live-analyzed`)
  }
  return { assets, inputWarnings }
}

function extractModelText(result) {
  if (!result) return ''
  if (typeof result === 'string') return result
  if (typeof result.response === 'string') return result.response
  const choiceContent = result.choices?.[0]?.message?.content
  if (typeof choiceContent === 'string') return choiceContent
  if (Array.isArray(choiceContent)) {
    return choiceContent
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
  }
  return ''
}

function parseJsonObjectFromText(raw) {
  const text = String(raw || '').trim()
  if (!text) return null

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = [text]
  if (fenced?.[1]) candidates.unshift(fenced[1].trim())

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1))
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Try next candidate
    }
  }
  return null
}

function splitNoteBeats(notes, targetCount) {
  const cleaned = cleanText(notes, MAX_NOTES_LENGTH)
  if (!cleaned) return []
  const rawParts = cleaned
    .split(/(?:,\s*)?\b(?:and\s+then|then|after\s+that|after\s+which|next)\b\s+|[.;!?]+|,\s*/gi)
    .map((segment) => segment.replace(/^and\s+/i, '').trim())
    .filter((segment) => segment.length >= 4)

  if (rawParts.length === 0) return [cleaned]
  return rawParts.slice(0, targetCount)
}

function buildFallbackDraft(payload, reason) {
  const beats = splitNoteBeats(payload.notes, payload.assets.length)
  const toneTemplates = {
    romantic: {
      title: 'A Good Day Worth Keeping',
      summary: 'A quick sequence of photos from today, put together while the little details are still fresh.',
      quote: 'Glad we actually took a few photos today instead of just saying we should.',
      captions: [
        'Starting off the day right here',
        'Had to stop and get a photo of this',
        'Right around the best part of the afternoon',
        'One of those little details I wanted to keep',
        'Winding down before heading back',
      ],
      bodies: [
        'First snapshot of the outing before we even knew how the rest of the day was going to go.',
        'Still glad I pulled my phone out here—this ended up being one of my favorite frames from the roll.',
        'By this point we had completely stopped checking the time and were just enjoying ourselves.',
        'Not the most staged photo, which is probably why I like it so much.',
        'Last photo of the roll before calling it a day. Definitely keeping this one.',
      ],
    },
    playful: {
      title: 'Zero Plan, Great Outing',
      summary: 'A handful of candid stops and unplanned detours from today.',
      quote: 'No real itinerary and somehow everything worked out anyway.',
      captions: [
        'How the whole outing started',
        'Official proof that the detour was worth it',
        'Right around when we went completely off-script',
        'The stop that stole the whole day',
        'Tired feet, zero regrets, roll done',
      ],
      bodies: [
        'Started with a loose idea and immediately got distracted by the first good thing we saw.',
        'One of those photos that instantly brings back whatever we were laughing about two seconds earlier.',
        'Halfway through and this was already way better than anything we actually planned.',
        'Every good day out needs one side quest that nobody wants to leave early.',
        'Wrapping up the day on a high note—definitely saving this batch.',
      ],
    },
    diary: {
      title: 'Notes From Today',
      summary: 'A few quick snapshots and notes from today before the week blurs together.',
      quote: 'Writing these down while I still remember the small stuff.',
      captions: [
        'First frame from today',
        'Paused here for a few minutes',
        'The part of the day I actually needed',
        'Small detail I want to remember later',
        'Heading back with a clearer head',
      ],
      bodies: [
        'Wanted to stick these together before they disappeared into my camera roll.',
        'Sometimes a quick photo reminds me of a day better than a whole journal page.',
        'Things finally slowed down right around here, and I was glad to just sit with it.',
        'Not anything huge, just the kind of ordinary detail that makes a day feel real.',
        'Closing out the roll before heading home—really glad I took these.',
      ],
    },
    editorial: {
      title: 'Day Notes · Roll 01',
      summary: 'A short photo sequence tracing the stops and pacing of today.',
      quote: 'Put the frames next to each other and the whole day comes right back.',
      captions: [
        'Opening frame of the day',
        'Moving into the next stop',
        'Middle of the outing',
        'Late afternoon detail',
        'Final frame before wrapping up',
      ],
      bodies: [
        'Sets the starting point for the rest of the roll.',
        'The outing picked up pace here as we moved from one spot to the next.',
        'Right in the middle of the day, with the best light and color of the batch.',
        'A smaller moment that ties the end of the roll back to where we started.',
        'Last exposure to close out the sequence cleanly.',
      ],
    },
  }

  const bank = toneTemplates[payload.tone] || toneTemplates.romantic
  const sections = payload.assets.map((asset, index) => {
    const beat = beats[index]
    const defaultCaption = bank.captions[index % bank.captions.length]
    const defaultBody = bank.bodies[index % bank.bodies.length]
    return {
      id: `section-${index + 1}`,
      assetId: asset.id,
      caption: beat ? beat.charAt(0).toUpperCase() + beat.slice(1) : defaultCaption,
      body: beat
        ? `${defaultBody} (${beat.charAt(0).toUpperCase() + beat.slice(1)}.)`
        : defaultBody,
    }
  })

  return {
    title: beats[0] && beats[0].length <= 42
      ? beats[0].charAt(0).toUpperCase() + beats[0].slice(1)
      : bank.title,
    summary: payload.notes
      ? `A ${payload.tone} scrapbook tracing ${payload.notes.slice(0, 110).replace(/[.!?]+$/, '')}.`
      : bank.summary,
    quote: payload.musicCue
      ? `${bank.quote} Soundtrack for today: ${payload.musicCue}.`
      : bank.quote,
    sections,
    diagnostics: {
      backend: 'cloudflare-fallback',
      runtime: 'cloudflare-workers-ai',
      model: PRIMARY_STORY_MODEL,
      reason,
      stage: 'finalize',
      generatedAt: new Date().toISOString(),
      available: true,
      modelInstalled: true,
      assetCount: payload.assets.length,
      ...(payload.inputWarnings.length ? { inputWarnings: payload.inputWarnings } : {}),
    },
  }
}

async function analyzePhotosWithVision(env, assets) {
  if (!env.AI) return []
  const visionAssets = assets.slice(0, MAX_VISION_ASSETS)
  const settled = await Promise.allSettled(
    visionAssets.map(async (asset, idx) => {
      const response = await env.AI.run(VISION_MODEL, {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe concretely in 1-2 plain factual sentences (max 38 words): what exact subjects, objects, food, people, or action are in this photo, the setting/place, and the lighting or time-of-day cues. Be literal and specific. No poetic metaphors, no guessed names or cities.',
              },
              { type: 'image_url', image_url: { url: asset.dataUrl } },
            ],
          },
        ],
        max_tokens: 90,
        temperature: 0.15,
      })
      const caption = cleanText(extractModelText(response), 260)
      return { index: idx + 1, assetId: asset.id, visual: caption }
    }),
  )

  return settled
    .filter((entry) => entry.status === 'fulfilled' && entry.value.visual)
    .map((entry) => entry.value)
}

const TONE_VOICE_GUIDES = {
  romantic:
    'Warm, affectionate, and personal—like someone writing fondly in a keepsake scrapbook about a favorite outing. Concrete and sweet, never cheesy or melodramatic.',
  playful:
    'Casual, witty, and light—like captions you write under photos for your best friend, noticing funny little details and detours.',
  diary:
    'Honest, conversational first-person notebook entries—plain, grounded personal thoughts about how the day actually felt.',
  editorial:
    'Clean, sharp, observant photo-journal notes—concise sentences focused on real details, pacing, and place without fluff.',
}

function buildStoryMessages(payload, visualNotes) {
  const visualMap = new Map(visualNotes.map((entry) => [entry.assetId, entry.visual]))
  const frameList = payload.assets
    .map((asset, idx) => {
      const visual = visualMap.get(asset.id)
      return `Photo ${idx + 1} (assetId: "${asset.id}"): ${visual || 'Candid photo from the same outing.'}`
    })
    .join('\n')

  const toneGuide = TONE_VOICE_GUIDES[payload.tone] || TONE_VOICE_GUIDES.romantic

  const systemPrompt = [
    'You write grounded, natural scrapbook captions for a photo sequence from a real day out.',
    'Imagine a real person pasting these exact photos in order into a physical scrapbook and writing a short caption + 1-2 casual sentences under each one.',
    '',
    'HARD RULES:',
    '1. CONCRETE & SPECIFIC: Every caption and body MUST reference concrete things actually visible in that specific photo (the exact food, drinks, street, view, table, lighting, outfit, room, or activity seen in the photo notes).',
    '2. COHERENT STORYLINE ACROSS PHOTOS: Connect Photo 1 -> Photo 2 -> ... -> Photo N into one natural timeline of the day (starting out, moving to the next spot, reacting to what happened, winding down). Earlier and later captions should naturally connect to each other.',
    '3. SOUND LIKE A REAL HUMAN, NOT ABSTRACT AI POETRY: Use simple, everyday spoken English. NEVER use abstract/melodramatic AI clichés like "whispers", "tapestry", "symphony", "echoes", "serendipitous", "timeless", "fleeting", "ethereal", "sanctuary", "haven", "hearts beat as one", "canvas of memories", or "in the quietest moments".',
    '4. NO ROBOTIC DESCRIPTIONS EITHER: Do not start with "This photo shows..." or "An image of...". Write in first-person ("we" or "I") as a lived moment.',
    '5. STAY FACTUAL: Do not invent names, cities, or events that are not in the photo notes or user note.',
    '',
    'GOOD EXAMPLE STYLE (for reference on voice—do not copy these topics):',
    '- Photo 1 (two iced coffees on a cafe table): caption "Started the afternoon with way too much caffeine", body "Met up at the cafe first before we even had a plan—those iced coffees basically carried the whole walk."',
    '- Photo 2 (sunny side street with small storefronts): caption "Took a detour down this side street", body "Still had our drinks in hand when we wandered off the main road and ended up peeking into every little shop."',
    '- Photo 3 (steaming bowls on a dinner table): caption "Finally caved and ordered way too much food", body "After walking for an hour we were starving, and honestly dinner alone made the whole detour worth it."',
    '',
    'Respond ONLY with valid JSON matching this exact schema:',
    '{',
    '  "title": "short natural scrapbook title (2-5 everyday words, not dramatic poetry)",',
    '  "summary": "1 plain, warm sentence summarizing the actual outing across all photos",',
    '  "quote": "1 natural, grounded closing thought someone would actually write on the cover",',
    '  "sections": [',
    '    { "id": "section-1", "assetId": "<exact assetId>", "caption": "natural 4-10 word scrapbook caption tied to this photo", "body": "1-2 casual, concrete sentences continuing the story from the previous photo" }',
    '  ]',
    '}',
  ].join('\n')

  const userPrompt = [
    `Tone: ${payload.tone} — ${toneGuide}`,
    payload.notes ? `User note about the day: ${payload.notes}` : 'User note about the day: (none—build the storyline directly from what happens across the photos)',
    payload.musicCue ? `Song/soundtrack noted by user: ${payload.musicCue}` : '',
    `Number of photos (MUST return exactly ${payload.assets.length} sections in this exact order with matching assetId): ${payload.assets.length}`,
    '',
    'What is actually in each photo in order:',
    frameList,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
}

function normalizeModelDraft(rawObject, payload, modelName, visionCount) {
  if (!rawObject || !Array.isArray(rawObject.sections)) return null
  const title = cleanText(rawObject.title, 90)
  const summary = cleanText(rawObject.summary, 240)
  const quote = cleanText(rawObject.quote, 200)
  if (!title || !summary || !quote) return null

  const byAssetId = new Map(
    rawObject.sections
      .filter((section) => section && typeof section === 'object')
      .map((section) => [String(section.assetId || ''), section]),
  )

  const sections = payload.assets.map((asset, index) => {
    const matched = byAssetId.get(asset.id) || rawObject.sections[index]
    const caption = cleanText(matched?.caption, 140)
    const body = cleanText(matched?.body, 360)
    if (!caption || !body) return null
    return {
      id: `section-${index + 1}`,
      assetId: asset.id,
      caption,
      body,
    }
  })

  if (sections.some((section) => section === null)) return null

  return {
    title,
    summary,
    quote,
    sections,
    diagnostics: {
      backend: 'cloudflare-workers-ai',
      runtime: 'cloudflare-workers-ai',
      model: visionCount > 0 ? `${modelName} (vision:${visionCount})` : modelName,
      reason: 'live-cloudflare-workers-ai',
      stage: 'finalize',
      generatedAt: new Date().toISOString(),
      available: true,
      modelInstalled: true,
      assetCount: payload.assets.length,
      ...(payload.inputWarnings.length ? { inputWarnings: payload.inputWarnings } : {}),
    },
  }
}

async function generateComposeDraft(env, payload) {
  if (!env.AI) {
    return buildFallbackDraft(payload, 'workers-ai-binding-missing')
  }

  let visualNotes = []
  try {
    visualNotes = await analyzePhotosWithVision(env, payload.assets)
  } catch {
    visualNotes = []
  }

  const messages = buildStoryMessages(payload, visualNotes)

  for (const model of [PRIMARY_STORY_MODEL, FALLBACK_STORY_MODEL]) {
    try {
      const response = await env.AI.run(model, {
        messages,
        max_tokens: 1400,
        temperature: 0.55,
        ...(model === PRIMARY_STORY_MODEL ? { response_format: { type: 'json_object' } } : {}),
      })
      const parsed = parseJsonObjectFromText(extractModelText(response))
      const normalized = normalizeModelDraft(parsed, payload, model.split('/').pop(), visualNotes.length)
      if (normalized) {
        return normalized
      }
    } catch {
      // Fall through to secondary model or grounded fallback
    }
  }

  return buildFallbackDraft(payload, 'workers-ai-quota-or-fallback')
}

async function handleRewrite(env, tone, text) {
  if (env.AI) {
    try {
      const response = await env.AI.run(PRIMARY_STORY_MODEL, {
        messages: [
          {
            role: 'system',
            content:
              'You polish short scrapbook captions so they sound like a real person writing naturally under a photo in a scrapbook. Keep the exact concrete details and meaning, avoid cheesy/abstract poetry clichés (no whispers/tapestry/echoes/serendipitous), match the requested tone, and reply ONLY with the rewritten text.',
          },
          {
            role: 'user',
            content: `Tone: ${tone}\nPassage: ${text}`,
          },
        ],
        max_tokens: 180,
        temperature: 0.65,
      })
      const rewritten = cleanText(extractModelText(response).replace(/^["“]|["”]$/g, ''), MAX_REWRITE_TEXT_LENGTH)
      if (rewritten) {
        return { text: rewritten, backend: 'cloudflare-workers-ai' }
      }
    } catch {
      // Fall back cleanly below
    }
  }

  return { text, backend: 'cloudflare-fallback' }
}

async function readBoundedJson(request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  if (!contentType.includes('application/json')) {
    return {
      error: jsonResponse(
        { error: { code: 'unsupported-media-type', message: 'Content-Type must be application/json.' } },
        415,
      ),
    }
  }

  const lengthHeader = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(lengthHeader) && lengthHeader > MAX_BODY_BYTES) {
    return {
      error: jsonResponse(
        { error: { code: 'payload-too-large', message: 'Selected photos exceed the 10 MB upload limit.' } },
        413,
      ),
    }
  }

  if (!request.body) {
    return {
      error: jsonResponse(
        { error: { code: 'invalid-json', message: 'Request body is required.' } },
        400,
      ),
    }
  }

  const reader = request.body.getReader()
  const chunks = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => null)
        return {
          error: jsonResponse(
            { error: { code: 'payload-too-large', message: 'Selected photos exceed the 10 MB upload limit.' } },
            413,
          ),
        }
      }
      chunks.push(value)
    }
  } catch {
    return {
      error: jsonResponse(
        { error: { code: 'invalid-request', message: 'Could not read request body.' } },
        400,
      ),
    }
  }

  const merged = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const text = new TextDecoder('utf-8').decode(merged)
    const body = JSON.parse(text)
    return { body }
  } catch {
    return {
      error: jsonResponse(
        { error: { code: 'invalid-json', message: 'Request body must be valid JSON.' } },
        400,
      ),
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      })
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      const aiAvailable = Boolean(env.AI)
      return jsonResponse({
        ok: true,
        available: aiAvailable,
        modelInstalled: aiAvailable,
        runtime: 'cloudflare-workers-ai',
        model: 'llama-4-scout-17b-vision',
        phase: aiAvailable ? 'ready' : 'unavailable',
        storage: 'none',
        limits: {
          maxClientAssets: MAX_CLIENT_ASSETS,
          maxVisionAssets: MAX_VISION_ASSETS,
          recommendedImageLongestSide: 960,
          composePerMinutePerIp: RATE_LIMIT_SPECS.compose.limit,
          rewritePerMinutePerIp: RATE_LIMIT_SPECS.rewrite.limit,
        },
      })
    }

    if ((url.pathname === '/api/generation-jobs' || url.pathname === '/api/generate') && request.method === 'POST') {
      const originError = verifyApiRequestOrigin(request, url)
      if (originError) return originError

      const startedAt = Date.now()
      const { body, error } = await readBoundedJson(request)
      if (error) return error
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return jsonResponse({ error: { code: 'invalid-request', message: 'Body must be a JSON object.' } }, 400)
      }

      const mode = cleanText(body.mode, 32)
      const tone = normalizeTone(body.tone)

      if (mode === 'rewrite-block') {
        if (url.pathname === '/api/generation-jobs') {
          return jsonResponse({ error: { code: 'invalid-request', message: 'Generation jobs only support compose requests.' } }, 400)
        }
        const limitError = await enforceRateLimit(request, env, 'rewrite')
        if (limitError) return limitError

        const text = cleanText(body.text, MAX_REWRITE_TEXT_LENGTH)
        if (!text) {
          return jsonResponse({ error: { code: 'invalid-request', message: 'Rewrite text is required.' } }, 400)
        }
        const rewritten = await handleRewrite(env, tone, text)
        return jsonResponse(rewritten)
      }

      const limitError = await enforceRateLimit(request, env, 'compose')
      if (limitError) return limitError

      const { assets, inputWarnings } = sanitizeAssets(body.assets)
      if (!assets.length) {
        return jsonResponse({ error: { code: 'invalid-request', message: 'At least one valid image asset is required.' } }, 400)
      }

      const composePayload = {
        tone,
        notes: cleanText(body.notes, MAX_NOTES_LENGTH),
        musicCue: cleanText(body.musicCue, MAX_MUSIC_CUE_LENGTH),
        assets,
        inputWarnings,
      }

      const draft = await generateComposeDraft(env, composePayload)
      console.log(
        JSON.stringify({
          event: 'memoir_generate',
          route: url.pathname,
          backend: draft.diagnostics.backend,
          model: draft.diagnostics.model,
          assetCount: assets.length,
          durationMs: Date.now() - startedAt,
        }),
      )

      if (url.pathname === '/api/generation-jobs') {
        const jobId = crypto.randomUUID()
        return jsonResponse({
          jobId,
          status: 'completed',
          stage: 'completed',
          progressPct: 100,
          result: draft,
        })
      }

      return jsonResponse(draft)
    }

    if (url.pathname.startsWith('/api/generation-jobs/') && url.pathname.endsWith('/cancel') && request.method === 'POST') {
      return jsonResponse({ ok: true, status: 'cancelled' })
    }

    return jsonResponse({ error: { code: 'not-found', message: 'API route not found.' } }, 404)
  },
}
