import { useConnectionStore } from '../stores/connectionStore'
import { useHistoryStore } from '../stores/historyStore'
import { ConnectionState, getStateColor, getStateLabel } from '../models/ConnectionState'

interface TopBarProps {
  onConnect: () => void
  onDisconnect: () => void
  onOpenDump: () => void
}

/**
 * 应用顶栏：图标 + 应用名 + 状态指示灯 + Host:Port + Token + 操作按钮 + 历史面板切换。
 * 高度 56px，渐变 #323233 → #2d2d2d；与 SVG 像素级一致。
 */
export function TopBar({ onConnect, onDisconnect, onOpenDump }: TopBarProps): JSX.Element {
  const { state, params, setParams } = useConnectionStore((s) => ({
    state: s.state, params: s.params, setParams: s.setParams
  }))
  const showHistoryPanel = useHistoryStore((s) => s.showHistoryPanel)
  const togglePanel = useHistoryStore((s) => s.toggleHistoryPanel)

  const isConnected = state === ConnectionState.Ready
  const isConnecting = state === ConnectionState.Connecting || state === ConnectionState.Authenticating
  const dotColor = getStateColor(state)

  return (
    <div className="bp-topbar-grad h-14 border-b border-border-base flex items-center px-4 gap-3 no-drag">
      {/* 应用图标 */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent-blue flex items-center justify-center text-white text-sm font-bold">
          B
        </div>
        <span className="text-fg-base text-sm font-semibold">BlueprintDebug</span>
      </div>

      {/* 状态指示灯 */}
      <div className="flex items-center gap-1.5 ml-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bp-breath' : ''}`}
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-fg-base text-[13px]">{getStateLabel(state)}</span>
      </div>

      {/* Host:Port 输入 */}
      <input
        className="bp-input font-mono w-[180px]"
        value={`${params.host}:${params.port}`}
        onChange={(e) => {
          const v = e.target.value.split(':')
          const host = v[0] ?? '127.0.0.1'
          const port = parseInt(v[1] ?? '17900', 10) || 17900
          setParams({ host, port })
        }}
        spellCheck={false}
      />

      {/* Token 输入 */}
      <input
        className="bp-input font-mono w-[200px]"
        type="password"
        placeholder="●●●●●●●● token"
        value={params.token}
        onChange={(e) => setParams({ token: e.target.value })}
        spellCheck={false}
      />

      {/* 连接 / 断开按钮 */}
      {isConnected ? (
        <button
          className="bg-accent-danger text-white text-[13px] font-medium px-5 py-1.5 rounded hover:brightness-110 active:brightness-95 transition"
          onClick={onDisconnect}
        >
          断开
        </button>
      ) : (
        <button
          className="bg-accent-blue text-white text-[13px] font-medium px-5 py-1.5 rounded hover:brightness-110 active:brightness-95 transition disabled:opacity-50"
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? '连接中…' : '连接'}
        </button>
      )}

      {/* 打开 Dump 按钮 */}
      <button
        className="bg-bg-input border border-border-subtle text-fg-base text-[13px] px-3 py-1.5 rounded hover:brightness-110 transition"
        onClick={onOpenDump}
      >
        📂 打开 Dump
      </button>

      <div className="flex-1" />

      {/* 历史面板切换（保持 SVG 中靠右的"已激活"风格）*/}
      <button
        className={
          'text-[13px] px-3 py-1.5 rounded border transition ' +
          (showHistoryPanel
            ? 'bg-accent-blueDeep border-accent-blue text-white'
            : 'bg-bg-input border-border-subtle text-fg-base hover:brightness-110')
        }
        onClick={togglePanel}
      >
        历史面板 ▾
      </button>
    </div>
  )
}
