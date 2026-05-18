import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appCssPath = new URL('../app/src/App.css', import.meta.url)

test('archive and create use the same stable app shell width', async () => {
  const css = await readFile(appCssPath, 'utf8')

  assert.match(css, /\.app\s*\{[^}]*--app-shell-width:\s*430px/s)
  assert.doesNotMatch(css, /\.app\.view-compose\s*\{[^}]*width:/s)
  assert.match(css, /\.bottom-nav\s*\{[^}]*width:\s*min\(100vw,\s*var\(--app-shell-width\)\)/s)
})

test('fixed bottom navigation reserves safe content space', async () => {
  const css = await readFile(appCssPath, 'utf8')

  assert.match(css, /\.app\s*\{[^}]*--bottom-nav-space:\s*112px/s)
  assert.match(css, /\.app\s*\{[^}]*padding:[^;]*var\(--bottom-nav-space\)/s)
})
