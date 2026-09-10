import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appCssPath = new URL('../app/src/App.css', import.meta.url)
const appPath = new URL('../app/src/App.tsx', import.meta.url)
const shellPath = new URL('../app/src/memoir/ui/MemoirShell.tsx', import.meta.url)
const settingsPath = new URL('../app/src/memoir/ui/SettingsScreen.tsx', import.meta.url)
const shareDialogPath = new URL('../app/src/memoir/ui/ShareExportDialog.tsx', import.meta.url)
const composePath = new URL('../app/src/memoir/ui/ComposeScreen.tsx', import.meta.url)
const statusLinePath = new URL('../app/src/memoir/ui/StatusLine.tsx', import.meta.url)

test('archive and create share responsive mobile and desktop shell widths', async () => {
  const css = await readFile(appCssPath, 'utf8')

  assert.match(css, /\.app\s*\{[^}]*--app-shell-width:\s*1180px/s)
  assert.match(css, /@media \(max-width:\s*719px\)[\s\S]*?\.app,[\s\S]*?--app-shell-width:\s*430px/s)
  assert.doesNotMatch(css, /\.app\.view-compose\s*\{[^}]*width:/s)
  assert.match(css, /@media \(min-width:\s*980px\)[\s\S]*?\.archive-list\s*\{[^}]*repeat\(3,/s)
  assert.match(css, /\.compose-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(280px, 340px\)/s)
})

test('fixed bottom navigation reserves safe content space', async () => {
  const css = await readFile(appCssPath, 'utf8')

  assert.match(css, /@media \(max-width:\s*719px\)[\s\S]*?--bottom-nav-space:\s*calc\(84px \+ env\(safe-area-inset-bottom\)\)/s)
  assert.match(css, /\.app\s*\{[^}]*padding:[^;]*var\(--bottom-nav-space\)/s)
  assert.match(css, /@media \(max-width:\s*719px\)[\s\S]*?\.bottom-nav\s*\{[^}]*position:\s*fixed/s)
  assert.match(css, /\.bottom-nav\s*\{[^}]*position:\s*static/s)
})

test('mobile AI status stays concise while retaining full accessible diagnostics', async () => {
  const statusLine = await readFile(statusLinePath, 'utf8')

  assert.match(statusLine, /On-device AI: \$\{health\}\. Current activity: \$\{stage\}/)
  assert.match(statusLine, /\? 'Ready'/)
  assert.match(statusLine, /\? 'Preparing' : 'Checking'/)
  assert.match(statusLine, /: 'Unavailable'/)
  assert.match(statusLine, /title=\{health\}/)
})

test('wireframe-backed settings and share surfaces are reachable and functional', async () => {
  const [shell, settings, shareDialog] = await Promise.all([
    readFile(shellPath, 'utf8'),
    readFile(settingsPath, 'utf8'),
    readFile(shareDialogPath, 'utf8'),
  ])

  assert.match(shell, /<span>Settings<\/span>/)
  assert.match(shell, /onSettings/)
  assert.match(shell, /inert=\{isModalOpen \? true : undefined\}/)
  assert.match(shell, /aria-hidden=\{isModalOpen \? true : undefined\}/)
  assert.match(settings, /Local AI status/)
  assert.match(settings, /Theme & layout/)
  assert.match(settings, /Share & export current memoir/)
  assert.match(shareDialog, /role="dialog"/)
  assert.match(shareDialog, /Save as PDF/)
  assert.match(shareDialog, /Export portable \.memoir/)
  assert.match(shareDialog, /Preparing social carousel/)
  assert.match(shareDialog, /Instagram \/ TikTok carousel/)
})

test('create screen explains the minimum photo count and hides developer routing by default', async () => {
  const compose = await readFile(composePath, 'utf8')

  assert.match(compose, /missingPhotoCount = Math\.max\(0, 3 - selectedCount\)/)
  assert.match(compose, /Add \$\{missingPhotoCount\} more photo/)
  assert.match(compose, /showAdvancedRuntimeSettings/)
  assert.match(compose, /showAdvancedRuntimeSettings \? \(/)
})

test('replacing or closing unsaved work is confirmation-gated', async () => {
  const app = await readFile(appPath, 'utf8')
  assert.match(app, /window\.addEventListener\('beforeunload', guardUnload\)/)
  assert.match(app, /Discard unsaved changes and open this memoir\?/)
  assert.match(app, /Discard unsaved changes and start a new memoir\?/)
})

test('mobile editor actions remain in document flow while desktop sidebar is sticky', async () => {
  const css = await readFile(appCssPath, 'utf8')

  assert.match(css, /\.editor-sidebar\s*\{\s*position:\s*static;/s)
  assert.match(css, /@media \(min-width:\s*980px\)[\s\S]*?\.editor-sidebar\s*\{[^}]*position:\s*sticky/s)
})
