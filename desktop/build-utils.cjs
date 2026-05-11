const fs = require('node:fs')
const path = require('node:path')

function getProjectRoot() {
  return path.resolve(__dirname, '..')
}

function removeDirIfPresent(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

function cleanRendererDist() {
  removeDirIfPresent(path.join(getProjectRoot(), 'app', 'dist'))
}

function cleanDesktopDist() {
  removeDirIfPresent(path.join(__dirname, 'dist'))
}

function validateRendererBuild() {
  const indexPath = path.join(getProjectRoot(), 'app', 'dist', 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Renderer build validation failed: ${indexPath} is missing.`)
  }

  return indexPath
}

module.exports = {
  cleanDesktopDist,
  cleanRendererDist,
  validateRendererBuild,
}