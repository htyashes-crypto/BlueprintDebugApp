import { useMemo } from 'react'
import { LIVE_INDEX, useHistoryStore } from '../stores/historyStore'
import { HistoryItem, LiveItem } from './HistoryItem'
import { matches } from '../services/SearchService'
import { formatContextTime } from '../models/LogCheckContext'

/**
 * 左栏历史面板：标题 + 搜索 + "实时数据"虚拟项 + 倒序历史列表。
 * 宽度 280px，与 SVG 一致。
 */
export function HistoryPanel(): JSX.Element {
  const { history, selectedIndex, liveRoot, searchHistoryText, setSearchHistory, setSelectedIndex } = useHistoryStore((s) => ({
    history: s.history,
    selectedIndex: s.selectedIndex,
    liveRoot: s.liveRoot,
    searchHistoryText: s.searchHistoryText,
    setSearchHistory: s.setSearchHistory,
    setSelectedIndex: s.setSelectedIndex
  }))

  const filtered = useMemo(() => {
    const q = searchHistoryText.trim()
    return history
      .map((ctx, idx) => ({ ctx, idx }))
      .filter(({ ctx }) => {
        if (!q) return true
        const blob = `${formatContextTime(ctx.timestamp)} ${ctx.name ?? ''}`
        return matches(blob, q)
      })
      .reverse()
  }, [history, searchHistoryText])

  const liveLogCount = liveRoot ? countLogs(liveRoot) : 0
  const liveRootCount = liveRoot ? 1 : 0

  return (
    <div className="w-[280px] flex-shrink-0 bg-bg-panel border-r border-border-base flex flex-col">
      <div className="px-4 pt-3 pb-2">
        <div className="text-fg-base text-[13px] font-semibold">历史记录 ({history.length}/50)</div>
      </div>
      <div className="px-3">
        <input
          className="bp-input w-full"
          placeholder="🔍 搜索历史项..."
          value={searchHistoryText}
          onChange={(e) => setSearchHistory(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="px-3 pt-3">
        <LiveItem
          selected={selectedIndex === LIVE_INDEX}
          rootCount={liveRootCount}
          liveLogCount={liveLogCount}
          onClick={() => setSelectedIndex(LIVE_INDEX)}
        />
      </div>

      <div className="border-t border-border-base mx-3 mt-3" />

      <div className="flex-1 overflow-y-auto bp-scroll px-3 py-2 space-y-1.5">
        {filtered.map(({ ctx, idx }) => (
          <HistoryItem
            key={`${idx}-${ctx.timestamp}`}
            index={idx}
            ctx={ctx}
            selected={selectedIndex === idx}
            onClick={() => setSelectedIndex(idx)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-fg-mute text-2xs italic text-center py-6">暂无历史记录</div>
        )}
      </div>
    </div>
  )
}

function countLogs(ctx: import('../models/LogCheckContext').LogCheckContext): number {
  let total = ctx.logs?.length ?? 0
  if (ctx.children) {
    for (const c of ctx.children) total += countLogs(c)
  }
  return total
}
