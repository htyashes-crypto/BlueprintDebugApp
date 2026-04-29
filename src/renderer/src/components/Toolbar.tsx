import { LIVE_INDEX, useHistoryStore } from '../stores/historyStore'
import { useConnectionStore } from '../stores/connectionStore'
import { ConnectionState } from '../models/ConnectionState'

interface ToolbarProps {
  onClear: () => void
  onRefresh: () => void
}

/**
 * 右栏顶部工具条：搜索框 + 模式下拉 + 清空 + 刷新 + 数据源标签。
 * 高度 48px，与 SVG 一致；搜索框宽 280。
 */
export function Toolbar({ onClear, onRefresh }: ToolbarProps): JSX.Element {
  const { searchTopText, searchMode, setSearchTop, setSearchMode, selectedIndex } = useHistoryStore((s) => ({
    searchTopText: s.searchTopText,
    searchMode: s.searchMode,
    setSearchTop: s.setSearchTop,
    setSearchMode: s.setSearchMode,
    selectedIndex: s.selectedIndex
  }))
  const connState = useConnectionStore((s) => s.state)

  const sourceLabel = selectedIndex === LIVE_INDEX
    ? '实时数据'
    : `历史记录 [${selectedIndex}]`

  return (
    <div className="h-12 bg-bg-panel border-b border-border-base flex items-center px-4 gap-3">
      <div className="relative">
        <input
          id="bp-top-search"
          className="bp-input w-[280px] pl-7"
          placeholder="🔍 在当前数据源中搜索..."
          value={searchTopText}
          onChange={(e) => setSearchTop(e.target.value)}
          spellCheck={false}
        />
        {searchTopText && (
          <button
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded text-white bg-border-subtle text-3xs flex items-center justify-center hover:brightness-110"
            onClick={() => setSearchTop('')}
            title="清空搜索"
          >
            ×
          </button>
        )}
      </div>

      <select
        className="bp-input w-[120px] cursor-pointer"
        value={searchMode}
        onChange={(e) => setSearchMode(e.target.value as 'name' | 'name+logs')}
      >
        <option value="name">仅名称</option>
        <option value="name+logs">名称+日志</option>
      </select>

      <button className="bp-mini-btn px-3 py-1.5 text-xs" onClick={onClear}>清空</button>
      <button className="bp-mini-btn px-3 py-1.5 text-xs" onClick={onRefresh}>⟳ 刷新</button>

      <div className="ml-auto flex items-center gap-2 text-2xs">
        <span className="text-fg-mute">当前查看：</span>
        <span className="text-fg-accent font-medium">{sourceLabel}</span>
        {connState !== ConnectionState.Ready && selectedIndex === LIVE_INDEX && (
          <span className="text-fg-mute italic ml-2">(未连接)</span>
        )}
      </div>
    </div>
  )
}
