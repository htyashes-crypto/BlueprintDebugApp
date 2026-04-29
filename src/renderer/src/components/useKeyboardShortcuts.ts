import { useEffect } from 'react'

interface ShortcutHandlers {
  /** Ctrl/Cmd+R：手动刷新（拉一次 history-snapshot）。 */
  onRefresh?: () => void
  /** Ctrl/Cmd+L：切换历史面板显示。 */
  onToggleHistoryPanel?: () => void
  /** Ctrl/Cmd+F：聚焦顶部搜索框。 */
  onFocusSearch?: () => void
  /** Ctrl/Cmd+K：清空当前实时数据。 */
  onClearLive?: () => void
  /** Ctrl/Cmd+Shift+C：连接 / 断开。 */
  onToggleConnect?: () => void
  /** Esc：关闭弹窗 / 取消重连。 */
  onEscape?: () => void
}

/**
 * 全局键盘快捷键。Mac 用 Cmd（metaKey），Win/Linux 用 Ctrl；与 VSCode 风格一致。
 * 输入框内（input/textarea/contenteditable）忽略，避免抢键；Esc 例外，可全局拦截。
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => {
      const isInsideEditable = isEditable(e.target as HTMLElement | null)
      const meta = e.ctrlKey || e.metaKey

      if (e.key === 'Escape') {
        handlers.onEscape?.()
        return
      }
      if (isInsideEditable) return

      if (meta && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        handlers.onRefresh?.()
      } else if (meta && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        handlers.onToggleHistoryPanel?.()
      } else if (meta && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        handlers.onFocusSearch?.()
      } else if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        handlers.onClearLive?.()
      } else if (meta && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        handlers.onToggleConnect?.()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handlers])
}

function isEditable(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  return false
}
