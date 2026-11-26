function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildMemoirFileName(title, extension = 'html') {
  return `${slugifyTitle(title) || 'memoir'}.${extension}`
}

function buildDiagnosticsFileName(title) {
  return `${slugifyTitle(title) || 'memoir'}-diagnostics.json`
}

function buildPortableMemoirFileName(title) {
  return buildMemoirFileName(title, 'memoir')
}

const HTML_THEMES = {
  'soft-archive': {
    bg: '#e8e3d9',
    paper: '#f4f0e8',
    card: '#faf7f0',
    ink: '#151311',
    muted: '#6c655c',
    accent: '#c43627',
    border: '#151311',
  },
  'noir-journal': {
    bg: '#070706',
    paper: '#0f0f0d',
    card: '#161614',
    ink: '#ebe5d9',
    muted: '#8a8376',
    accent: '#e45c33',
    border: 'rgba(235, 229, 217, 0.35)',
  },
  'film-notes': {
    bg: '#dde3e9',
    paper: '#edf1f5',
    card: '#f7f9fb',
    ink: '#0f2342',
    muted: '#566882',
    accent: '#b8661e',
    border: '#0f2342',
  },
}

const DEFAULT_STAMP_URL = 'https://memoir.memoir-press.workers.dev/'
const DEFAULT_STAMP_LABEL = 'memoir.memoir-press.workers.dev'

function renderMemoirHtml(memoir, options = {}) {
  const includeStamp = options?.includeStamp !== false
  const palette = HTML_THEMES[memoir.theme] || HTML_THEMES['soft-archive']
  const assetMap = new Map(memoir.assets.map((asset) => [asset.id, asset]))
  const dateText = escapeHtml(
    new Date(memoir.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
  )
  const musicMarkup = memoir.musicCue
    ? `<span class="pill">♪ ${escapeHtml(memoir.musicCue)}</span>`
    : ''

  const sections = memoir.sections
    .map((section, index) => {
      const asset = assetMap.get(section.assetId)
      const frameNo = String(index + 1).padStart(2, '0')
      return `
        <article class="section-card" data-card>
          <div class="card-inner">
            <div class="face front">
              <div class="media-wrap" data-develop-frame>
                <img class="section-image" src="${escapeHtml(asset?.dataUrl || '')}" alt="${escapeHtml(section.caption)}" />
                <span class="frame-badge">${frameNo} / ${String(memoir.sections.length).padStart(2, '0')}</span>
                <div class="darkroom-veil" aria-hidden="true"><span>Click to develop print ${frameNo}</span></div>
              </div>
              <div class="copy-block">
                <p class="eyebrow">${escapeHtml(memoir.tone)} · EXP ${frameNo}A</p>
                <h2>${escapeHtml(section.caption)}</h2>
                <p>${escapeHtml(section.body)}</p>
                <button class="mini-btn" type="button" data-flip>Flip print note</button>
              </div>
            </div>
            <div class="face back">
              <p class="eyebrow">BACK OF PRINT · ${frameNo}A</p>
              <h3>“${escapeHtml(section.caption)}”</h3>
              <p class="back-body">${escapeHtml(section.body)}</p>
              <button class="mini-btn" type="button" data-flip>Back to photo</button>
            </div>
          </div>
        </article>
      `
    })
    .join('')

  const colophonMarkup = includeStamp
    ? `
        <footer class="colophon">
          <span>MEMOIR 400 · 35MM PRINT EDITION</span>
          <a href="${DEFAULT_STAMP_URL}" target="_blank" rel="noopener noreferrer">${DEFAULT_STAMP_LABEL}</a>
        </footer>`
    : ''

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(memoir.title)}</title>
      <style>
        :root { --bg: ${palette.bg}; --paper: ${palette.paper}; --card: ${palette.card}; --ink: ${palette.ink}; --muted: ${palette.muted}; --accent: ${palette.accent}; --border: ${palette.border}; }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 'Avenir Next', 'Segoe UI', Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        main { max-width: 720px; margin: 0 auto; padding: 32px 22px 72px; background: var(--paper); min-height: 100vh; box-shadow: 0 0 0 1px var(--border); }
        .topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 18px; border-bottom: 2px solid var(--border); margin-bottom: 26px; }
        .brand { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 24px; letter-spacing: 0.06em; text-transform: uppercase; margin: 0; }
        .controls { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill, .ctrl-btn, .mini-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 13px; border: 1px solid var(--border); border-radius: 0; background: var(--card); color: var(--ink); font: 600 11px/1.2 ui-monospace, Menlo, monospace; letter-spacing: 0.1em; text-transform: uppercase; }
        .ctrl-btn, .mini-btn { cursor: pointer; }
        .ctrl-btn[aria-pressed="true"] { background: var(--accent); color: #ffffff; border-color: var(--accent); }
        .eyebrow { font: 700 11px/1.2 ui-monospace, Menlo, monospace; text-transform: uppercase; letter-spacing: 0.16em; color: var(--accent); margin: 0 0 8px; }
        h1, h2, h3 { font-family: 'Iowan Old Style', Georgia, 'Times New Roman', serif; font-weight: 500; color: var(--ink); margin: 0; }
        h1 { font-size: clamp(38px, 8vw, 60px); font-style: italic; line-height: 0.96; margin-bottom: 14px; }
        h2 { font-size: 28px; line-height: 1.1; margin-bottom: 10px; }
        h3 { font-size: 26px; font-style: italic; line-height: 1.15; margin-bottom: 14px; }
        .summary { color: var(--muted); font-size: 17px; margin: 0 0 18px; }
        .hero { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border: 1px solid var(--border); display: block; margin: 22px 0; }
        .quote { font-family: Georgia, serif; font-style: italic; font-size: 24px; line-height: 1.3; padding: 14px 18px; border-left: 3px solid var(--accent); background: var(--card); margin: 24px 0 36px; }
        .deck { display: grid; gap: 28px; }
        .section-card { perspective: 1400px; }
        .card-inner { display: grid; transform-style: preserve-3d; transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1); }
        .section-card.is-flipped .card-inner { transform: rotateY(180deg); }
        .face { grid-area: 1 / 1; backface-visibility: hidden; border: 1px solid var(--border); background: var(--card); overflow: hidden; }
        .back { transform: rotateY(180deg); padding: 28px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
        .back-body { color: var(--muted); font-size: 17px; line-height: 1.65; }
        .media-wrap { position: relative; aspect-ratio: 4 / 5; overflow: hidden; cursor: pointer; }
        .section-image { width: 100%; height: 100%; display: block; object-fit: cover; transition: filter 600ms ease, transform 600ms ease; }
        .frame-badge { position: absolute; top: 12px; left: 12px; padding: 4px 10px; background: rgba(16,18,17,0.8); color: #fff; font: 700 11px/1 ui-monospace, Menlo, monospace; letter-spacing: 0.1em; }
        .copy-block { padding: 20px; display: grid; gap: 8px; }
        .copy-block p { margin: 0; color: var(--muted); }
        .darkroom-veil { position: absolute; inset: 0; display: none; place-items: center; background: radial-gradient(circle, rgba(228,92,51,0.22), rgba(20,11,10,0.94)); color: #f4d6b5; font: italic 22px Georgia, serif; text-align: center; padding: 20px; transition: opacity 550ms ease; }
        body.is-darkroom .media-wrap:not(.is-developed) .darkroom-veil { display: grid; }
        body.is-darkroom .media-wrap:not(.is-developed) .section-image { filter: blur(10px) sepia(0.6); }
        .colophon { margin-top: 44px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font: 700 11px/1.2 ui-monospace, Menlo, monospace; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
        .colophon a { color: var(--accent); text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 1px; }
        @media print { .controls, .mini-btn, .darkroom-veil { display: none !important; } main { box-shadow: none; padding: 0; } .section-card { break-inside: avoid; } }
      </style>
    </head>
    <body>
      <main>
        <header class="topbar">
          <p class="brand">Memoir</p>
          <div class="controls">
            ${musicMarkup}
            <button class="ctrl-btn" type="button" id="toggle-darkroom" aria-pressed="false">Darkroom reveal</button>
          </div>
        </header>
        <p class="eyebrow">memoir export · ${dateText}</p>
        <h1>${escapeHtml(memoir.title)}</h1>
        <p class="summary">${escapeHtml(memoir.summary)}</p>
        <img class="hero" src="${escapeHtml(memoir.assets[0]?.dataUrl || '')}" alt="${escapeHtml(memoir.title)}" />
        <p class="quote">${escapeHtml(memoir.quote)}</p>
        <section class="deck">${sections}</section>${colophonMarkup}
      </main>
      <script>
        (function () {
          document.querySelectorAll('[data-flip]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var card = btn.closest('[data-card]');
              if (card) card.classList.toggle('is-flipped');
            });
          });
          document.querySelectorAll('[data-develop-frame]').forEach(function (frame) {
            frame.addEventListener('click', function () {
              if (document.body.classList.contains('is-darkroom')) {
                frame.classList.add('is-developed');
              }
            });
          });
          var dr = document.getElementById('toggle-darkroom');
          if (dr) {
            dr.addEventListener('click', function () {
              var on = document.body.classList.toggle('is-darkroom');
              dr.setAttribute('aria-pressed', String(on));
              if (on) {
                document.querySelectorAll('[data-develop-frame]').forEach(function (f) { f.classList.remove('is-developed'); });
              }
            });
          }
        })();
      </script>
    </body>
  </html>`
}

function buildMemoirDiagnosticsExport(memoir) {
  return {
    memoirId: memoir.id,
    title: memoir.title,
    createdAt: memoir.createdAt,
    updatedAt: memoir.updatedAt,
    tone: memoir.tone,
    theme: memoir.theme,
    assetCount: memoir.assets.length,
    assets: memoir.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      width: asset.width,
      height: asset.height,
    })),
    diagnostics: memoir.diagnostics,
    prototype: {
      storage: 'browser-indexeddb',
      encryptedAtRest: false,
      exportFormats: ['memoir', 'html', 'print-pdf', 'instagram-slides', 'contact-sheet-png', 'cinema-reel-webm'],
    },
  }
}

function renderMemoirDiagnosticsJson(memoir) {
  return `${JSON.stringify(buildMemoirDiagnosticsExport(memoir), null, 2)}\n`
}

export {
  buildDiagnosticsFileName,
  buildMemoirDiagnosticsExport,
  buildMemoirFileName,
  buildPortableMemoirFileName,
  escapeHtml,
  renderMemoirDiagnosticsJson,
  renderMemoirHtml,
}
