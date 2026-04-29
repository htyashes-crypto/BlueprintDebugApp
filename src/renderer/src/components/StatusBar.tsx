import { useConnectionStore } from '../stores/connectionStore'
import { useHistoryStore } from '../stores/historyStore'
import { ConnectionState, getStateLabel } from '../models/ConnectionState'
import { ReconnectIndicator } from './ReconnectIndicator'

interface StatusBarProps {
  onReconnectCancel: () => void
  onReconnectRetryNow: () => void
}

/** 底部状态栏 24px，VSCode 蓝 #0078d4；信息从左到右与 SVG 一致。 */
export function StatusBar({ onReconnectCancel, onReconnectRetryNow }: StatusBarProps): JSX.Element {
  const { state, params, pingMs, recvCount, sentCount } = useConnectionStore((s) => ({
    state: s.state,
    params: s.params,
    pingMs: s.pingMs,
    recvCount: s.recvCount,
    sentCount: s.sentCount
  }))
  const { liveRoot, history } = useHistoryStore((s) => ({ liveRoot: s.liveRoot, history: s.history }))

  const wsUrl = `ws://${params.host}:${params.port}`
  const isConnected = state === ConnectionState.Ready

  return (
    <div className="h-6 bg-accent-status text-white text-2xs flex items-center px-4 gap-4 select-none">
      <span>● {isConnected ? `已连接 ${wsUrl}` : getStateLabel(state)}</span>
      {isConnected && <span>⟳ ping {pingMs}ms</span>}
      <span>↓ {recvCount} / ↑ {sentCount}</span>
      <span>实时 {liveRoot ? 1 : 0} 上下文 · 历史 {history.length}/50</span>
      <ReconnectIndicator onCancel={onReconnectCancel} onRetryNow={onReconnectRetryNow} />
      <div className="flex-1" />
      <span>v0.1.0</span>
    </div>
  )
}
