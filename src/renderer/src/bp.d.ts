/** preload 通过 contextBridge 暴露的 API；与 src/preload/index.ts 中的 api 对齐。 */
export {}

export interface DiscoveryInfo {
  host: string
  port: number
  token: string
  timestamp: number
  pid: number
  source: 'editor' | 'player'
  productName: string
  serverVersion: string
}

declare global {
  interface Window {
    bp: {
      getSetting: (key: string) => Promise<unknown>
      setSetting: (key: string, value: unknown) => Promise<true>
      openDumpFile: () => Promise<{ path: string; text: string } | null>
      readDiscovery: () => Promise<DiscoveryInfo | null>
      getDiscoveryPath: () => Promise<string>
      checkForUpdate: () => Promise<unknown>
      downloadUpdate: () => Promise<unknown>
      installUpdate: () => Promise<unknown>
      onUpdateChecking: (cb: () => void) => () => void
      onUpdateAvailable: (cb: (info: unknown) => void) => () => void
      onUpdateNotAvailable: (cb: (info: unknown) => void) => () => void
      onUpdateProgress: (cb: (progress: unknown) => void) => () => void
      onUpdateDownloaded: (cb: (info: unknown) => void) => () => void
      onUpdateError: (cb: (err: { message: string }) => void) => () => void
      onMenuCommand: (cb: (cmd: string) => void) => () => void
    }
  }
}
