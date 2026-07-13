export {}

declare global {
  interface Window {
    memoirDesktop?: {
      apiBase?: string
      packaged?: boolean
    }
  }
}
