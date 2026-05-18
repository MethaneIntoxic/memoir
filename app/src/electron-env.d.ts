export {}

declare global {
  interface Window {
    memoirDesktop?: {
      apiBase?: string
      packaged?: boolean
    }
    memoirAndroidAi?: {
      health(): Promise<unknown>
      generateMemoir(payload: unknown): Promise<unknown>
      cancelGeneration(jobId: string): Promise<unknown>
    }
  }
}
