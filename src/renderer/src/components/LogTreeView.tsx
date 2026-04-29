import { useEffect, useRef, useState } from 'react'
import { useHistoryStore, selectCurrentRoot, LIVE_INDEX } from '../stores/historyStore'
import { LogContextNode } from './LogContextNode'
import { WelcomeOverlay } from './WelcomeOverlay'

/**
 * 右栏内容区：基于当前数据源（实时或历史）渲染递归卡片树。
 * 实时模式 + 用户停留在底部时，新增日志自动滚到底；用户手动往上翻则停留在原位避免被打断。
 */
export function LogTreeView(): JSX.Element {
  const root = useHistoryStore((s) => selectCurrentRoot(s))
  const selectedIndex = useHistoryStore((s) => s.selectedIndex)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)

  // 切换数据源时回到底部
  useEffect(() => {
    setStickToBottom(true)
    queueMicrotask(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [selectedIndex])

  // 实时根树更新时，若已贴底则跟随滚动
  useEffect(() => {
    if (selectedIndex !== LIVE_INDEX) return
    if (!stickToBottom) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [root, selectedIndex, stickToBottom])

  const onScroll = (): void => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setStickToBottom(distFromBottom < 24)
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto bp-scroll px-3 py-3"
      >
        {root ? (
          <LogContextNode ctx={root} depth={0} pathKey="root" />
        ) : (
          <div className="text-fg-mute text-sm italic text-center py-12">
            暂无调试数据。请在 Unity 中执行蓝图函数后查看。
          </div>
        )}
      </div>
      <WelcomeOverlay />
      {selectedIndex === LIVE_INDEX && !stickToBottom && root && (
        <button
          className="absolute right-4 bottom-4 bp-mini-btn px-3 py-1.5 text-2xs shadow-md"
          onClick={() => {
            setStickToBottom(true)
            const el = scrollRef.current
            if (el) el.scrollTop = el.scrollHeight
          }}
        >
          ⤓ 跳到最新
        </button>
      )}
    </div>
  )
}
