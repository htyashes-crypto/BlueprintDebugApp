import { useEffect, useState } from 'react'
import { useConnectionStore } from '../stores/connectionStore'
import { ConnectionState } from '../models/ConnectionState'

interface ReconnectIndicatorProps {
  onCancel: () => void
  onRetryNow: () => void
}

/**
 * 重连倒计时提示；仅在 state == Reconnecting 时显示。
 * 每 250ms 局部刷新一次 now，呈现 "下次重连 3.2s" 倒计时；倒计时归零后由外部定时器触发重连。
 */
export function ReconnectIndicator({ onCancel, onRetryNow }: ReconnectIndicatorProps): JSX.Element | null {
  const { state, attempt, nextAt } = useConnectionStore((s) => ({
    state: s.state,
    attempt: s.reconnectAttempt,
    nextAt: s.nextAttemptAtMs
  }))
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (state !== ConnectionState.Reconnecting) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [state])

  if (state !== ConnectionState.Reconnecting) return null

  const remainingMs = nextAt != null ? Math.max(0, nextAt - now) : 0
  const seconds = (remainingMs / 1000).toFixed(1)

  return (
    <div className="flex items-center gap-2 text-mac-yellow text-2xs">
      <span className="w-2 h-2 rounded-full bg-mac-yellow bp-pulse" />
      <span>第 {attempt} 次重连 · 倒计时 {seconds}s</span>
      <button
        className="bp-mini-btn px-2 py-0 text-3xs hover:brightness-110"
        onClick={onRetryNow}
        title="立即重试，跳过倒计时"
      >
        立即重试
      </button>
      <button
        className="bp-mini-btn px-2 py-0 text-3xs hover:brightness-110"
        onClick={onCancel}
        title="取消重连，回到未连接状态"
      >
        取消
      </button>
    </div>
  )
}
