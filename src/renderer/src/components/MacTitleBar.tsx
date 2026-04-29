import { useConnectionStore } from '../stores/connectionStore'
import { useHistoryStore, selectCurrentRoot } from '../stores/historyStore'
import { getStateLabel } from '../models/ConnectionState'

/**
 * macOS 风格标题栏：左侧红黄绿信号灯 + 居中标题。高度 32px，与 SVG 一致。
 * 整条 drag-region 让用户可拖窗，按钮区域 no-drag。
 */
export function MacTitleBar(): JSX.Element {
  const state = useConnectionStore((s) => s.state)
  const live = useHistoryStore((s) => selectCurrentRoot(s))
  const liveName = live?.name ?? ''
  const stateLabel = getStateLabel(state)
  const title = liveName
    ? `蓝图调试 BlueprintDebug — ${liveName} (${stateLabel})`
    : `蓝图调试 BlueprintDebug — ${stateLabel}`

  return (
    <div className="drag-region relative h-8 bg-bg-titleBar border-b border-border-base flex items-center px-5">
      <div className="no-drag flex items-center gap-2.5">
        <span className="w-3 h-3 rounded-full bg-mac-red ring-1 ring-black/30" />
        <span className="w-3 h-3 rounded-full bg-mac-yellow ring-1 ring-black/30" />
        <span className="w-3 h-3 rounded-full bg-mac-green ring-1 ring-black/30" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 text-fg-muteBright text-[12px] truncate max-w-[60%]">
        {title}
      </div>
    </div>
  )
}
