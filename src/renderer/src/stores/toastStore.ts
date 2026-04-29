import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
  /** 持续毫秒；0 表示常驻直到手动关闭。 */
  durationMs: number
}

interface ToastStore {
  toasts: Toast[]
  push: (kind: ToastKind, title: string, message?: string, durationMs?: number) => number
  dismiss: (id: number) => void
  clear: () => void
}

let m_seq = 1

/** 全局 Toast 队列；右下角浮窗自动消失。 */
export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (kind, title, message, durationMs = 4000) => {
    const id = m_seq++
    set((s) => ({ toasts: [...s.toasts, { id, kind, title, message, durationMs }] }))
    if (durationMs > 0) {
      window.setTimeout(() => {
        const exists = get().toasts.find((t) => t.id === id)
        if (exists) get().dismiss(id)
      }, durationMs)
    }
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] })
}))

/** 简短入口，方便业务侧快速调用；durationMs 不传走默认 4000，传 0 则常驻。 */
export const toast = {
  info: (title: string, msg?: string, durationMs?: number): number =>
    useToastStore.getState().push('info', title, msg, durationMs),
  success: (title: string, msg?: string, durationMs?: number): number =>
    useToastStore.getState().push('success', title, msg, durationMs),
  warning: (title: string, msg?: string, durationMs?: number): number =>
    useToastStore.getState().push('warning', title, msg, durationMs),
  error: (title: string, msg?: string, durationMs = 6000): number =>
    useToastStore.getState().push('error', title, msg, durationMs)
}
