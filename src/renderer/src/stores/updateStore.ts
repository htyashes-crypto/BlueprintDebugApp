import { create } from 'zustand'

/** electron-updater 的 UpdateInfo 子集（只保留 UI 需要的字段）。 */
export interface UpdateInfo {
  version: string
  /** GitHub Release 描述：可能是 string、string[]，或 [{ note, version }] 数组。 */
  releaseNotes?: string | Array<{ version: string; note: string }> | null
  releaseName?: string | null
  releaseDate?: string | null
}

/** download-progress 事件载荷。 */
export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

/** 自动更新状态机。 */
export type UpdateState =
  | 'idle'           // 未检查或对方版本最新
  | 'checking'       // 正在检查
  | 'available'      // 检测到新版本，等待用户决定
  | 'downloading'    // 用户已点"立即更新"，下载中
  | 'downloaded'     // 下载完成，等待重启
  | 'error'          // 出错（网络 / GitHub 限流 / 文件签名等）
  | 'dismissed'      // 用户点了"稍后"，本次启动不再弹

interface UpdateStore {
  state: UpdateState
  info: UpdateInfo | null
  progress: UpdateProgress | null
  errorMessage: string | null
  /** 用户主动点了"检查更新"还是启动时自动；前者出错也要 toast，后者静默。 */
  manuallyTriggered: boolean
  setState: (s: UpdateState) => void
  setInfo: (info: UpdateInfo | null) => void
  setProgress: (p: UpdateProgress | null) => void
  setError: (msg: string | null) => void
  setManuallyTriggered: (b: boolean) => void
  reset: () => void
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  state: 'idle',
  info: null,
  progress: null,
  errorMessage: null,
  manuallyTriggered: false,
  setState: (state) => set({ state }),
  setInfo: (info) => set({ info }),
  setProgress: (progress) => set({ progress }),
  setError: (errorMessage) => set({ errorMessage }),
  setManuallyTriggered: (manuallyTriggered) => set({ manuallyTriggered }),
  reset: () => set({ state: 'idle', info: null, progress: null, errorMessage: null, manuallyTriggered: false })
}))

/** 把 releaseNotes（可能是 string / 数组 / null）规范成 string，便于直接渲染。 */
export function normalizeReleaseNotes(notes: UpdateInfo['releaseNotes']): string {
  if (!notes) return ''
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map((n) => `### ${n.version}\n\n${n.note}`)
      .join('\n\n---\n\n')
  }
  return ''
}
