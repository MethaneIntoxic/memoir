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

function renderMemoirHtml(memoir) {
  const assetMap = new Map(memoir.assets.map((asset) => [asset.id, asset]))
  const sections = memoir.sections
    .map((section) => {
      const asset = assetMap.get(section.assetId)
      return `
        <article class="section-card">
          <img class="section-image" src="${asset?.dataUrl || ''}" alt="${escapeHtml(section.caption)}" />
          <p class="eyebrow">${escapeHtml(memoir.tone)}</p>
          <h2>${escapeHtml(section.caption)}</h2>
          <p>${escapeHtml(section.body)}</p>
        </article>
      `
    })
    .join('')

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(memoir.title)}</title>
      <style>
        body { margin: 0; background: #f4f7f1; color: #121512; font: 17px/1.6 'Avenir Next', 'Trebuchet MS', sans-serif; }
        main { max-width: 430px; margin: 0 auto; padding: 24px 20px 80px; }
        .eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 11px; color: #5d685c; margin: 0 0 8px; }
        h1, h2 { font-family: Georgia, 'Times New Roman', serif; color: #121512; }
        h1 { font-size: 56px; line-height: 0.92; margin: 0 0 14px; }
        h2 { font-size: 34px; line-height: 1.05; margin: 0 0 10px; }
        .hero { border: 1px solid #121512; box-shadow: 6px 6px 0 #121512; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; margin: 24px 0 24px; }
        .section-card { margin: 28px 0 40px; }
        .section-image { width: 100%; display: block; aspect-ratio: 4 / 5; object-fit: cover; border: 1px solid #121512; box-shadow: 6px 6px 0 #121512; margin-bottom: 18px; }
        .quote { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 28px; line-height: 1.2; margin: 26px 0; }
      </style>
    </head>
    <body>
      <main>
        <p class="eyebrow">memoir export</p>
        <h1>${escapeHtml(memoir.title)}</h1>
        <p>${escapeHtml(memoir.summary)}</p>
        <img class="hero" src="${memoir.assets[0]?.dataUrl || ''}" alt="${escapeHtml(memoir.title)}" />
        <p class="quote">${escapeHtml(memoir.quote)}</p>
        ${sections}
      </main>
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
      exportFormats: ['memoir', 'html', 'print-pdf'],
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
