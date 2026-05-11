const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('memoirDesktop', {
  apiBase: process.env.MEMOIR_DESKTOP_API_BASE || 'http://127.0.0.1:8787/api',
  packaged: process.env.MEMOIR_DESKTOP_PACKAGED === '1',
})