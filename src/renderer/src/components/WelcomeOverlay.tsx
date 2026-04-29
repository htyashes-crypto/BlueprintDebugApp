import { useConnectionStore } from '../stores/connectionStore'
import { useHistoryStore, selectCurrentRoot, LIVE_INDEX } from '../stores/historyStore'
import { ConnectionState } from '../models/ConnectionState'

/**
 * 未连接 + 数据为空时显示的引导面板，告诉用户怎么连。
 * 在右栏（LogTreeView 区域）覆盖式渲染，用户点连接 / 打开 dump 后自动消失。
 */
export function WelcomeOverlay(): JSX.Element | null {
  const state = useConnectionStore((s) => s.state)
  const { history, selectedIndex } = useHistoryStore((s) => ({
    history: s.history,
    selectedIndex: s.selectedIndex
  }))
  const liveRoot = useHistoryStore((s) => selectCurrentRoot(s))

  // 仅在 "未连接 + 当前数据源为空" 时显示
  const isViewingLive = selectedIndex === LIVE_INDEX
  const hasAnyData = history.length > 0 || !!liveRoot
  if (state === ConnectionState.Ready) return null
  if (hasAnyData && !isViewingLive) return null
  if (hasAnyData && isViewingLive && liveRoot) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-[540px] text-center px-8 py-6 rounded-lg bg-bg-panelAlt/60 border border-border-base backdrop-blur-sm">
        <div className="text-[36px] mb-2 inline-flex items-center gap-2">
          <span>🔌</span>
          <span className="w-2 h-2 rounded-full bg-mac-yellow bp-pulse" />
        </div>
        <div className="text-fg-base text-base font-semibold mb-2">正在自动发现 Unity 调试桥…</div>
        <div className="text-fg-mute text-2xs leading-relaxed space-y-1.5">
          <div>App 每 3 秒检查 <span className="text-fg-accent font-mono">~/.blueprint-debug/discovery.json</span></div>
          <div>Unity 启动后自动写入此文件，桌面端发现即连接，<span className="text-accent-live">无需手动复制 Token</span></div>
          <div className="pt-2 border-t border-border-base/60 mt-3 text-fg-mute">
            如长时间未连：检查 <span className="text-fg-accent font-mono">DebugCfg › 调试桥 › 总开关</span> 已勾选；Editor 需进 Play Mode
          </div>
          <div className="text-fg-mute">
            或点 <span className="text-fg-accent font-medium">📂 打开 Dump</span> 加载离线导出的调试日志
          </div>
        </div>
        <div className="mt-4 text-3xs text-fg-mute italic">
          快捷键：<kbd className="bp-mini-btn px-1.5 py-0">Ctrl+R</kbd> 刷新
          ·{' '}
          <kbd className="bp-mini-btn px-1.5 py-0">Ctrl+L</kbd> 切面板
          ·{' '}
          <kbd className="bp-mini-btn px-1.5 py-0">Ctrl+F</kbd> 搜索
        </div>
      </div>
    </div>
  )
}
