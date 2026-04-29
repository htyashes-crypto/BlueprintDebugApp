import { create } from 'zustand'
import type { LogCheckContext } from '../models/LogCheckContext'

/** 选中索引：-1 表示当前查看实时数据；>=0 表示查看历史数组中的某条快照。 */
export const LIVE_INDEX = -1

/** 离线 dump 模式元信息；非 null 时表示当前历史来自磁盘 dump 文件，禁用实时连接动作。 */
export interface DumpInfo {
  filePath: string
  fileName: string
  version: string
  exportedAt: number
  recordCount: number
}

interface HistoryStore {
  history: LogCheckContext[]
  selectedIndex: number
  liveRoot: LogCheckContext | null
  dumpInfo: DumpInfo | null
  searchTopText: string
  searchHistoryText: string
  searchMode: 'name' | 'name+logs'
  showHistoryPanel: boolean
  panelExpanded: Map<string, boolean>
  setHistory: (history: LogCheckContext[]) => void
  setSelectedIndex: (idx: number) => void
  setLiveRoot: (ctx: LogCheckContext | null) => void
  prependHistory: (ctx: LogCheckContext, max?: number) => void
  clear: (scope: 'live' | 'history' | 'all') => void
  setDumpInfo: (info: DumpInfo | null) => void
  setSearchTop: (s: string) => void
  setSearchHistory: (s: string) => void
  setSearchMode: (m: 'name' | 'name+logs') => void
  toggleHistoryPanel: () => void
  setExpanded: (key: string, expanded: boolean) => void
  resetExpanded: () => void
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  selectedIndex: LIVE_INDEX,
  liveRoot: null,
  dumpInfo: null,
  searchTopText: '',
  searchHistoryText: '',
  searchMode: 'name+logs',
  showHistoryPanel: true,
  panelExpanded: new Map(),
  setHistory: (history) => set({ history }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex, panelExpanded: new Map() }),
  setLiveRoot: (liveRoot) => set({ liveRoot }),
  prependHistory: (ctx, max = 50) => set((s) => {
    const next = [...s.history, ctx]
    while (next.length > max) next.shift()
    return { history: next }
  }),
  clear: (scope) => set((s) => {
    if (scope === 'live') return { liveRoot: null }
    if (scope === 'history') return { history: [], selectedIndex: LIVE_INDEX }
    return { liveRoot: null, history: [], selectedIndex: LIVE_INDEX }
  }),
  setDumpInfo: (dumpInfo) => set({ dumpInfo }),
  setSearchTop: (searchTopText) => set({ searchTopText }),
  setSearchHistory: (searchHistoryText) => set({ searchHistoryText }),
  setSearchMode: (searchMode) => set({ searchMode }),
  toggleHistoryPanel: () => set((s) => ({ showHistoryPanel: !s.showHistoryPanel })),
  setExpanded: (key, expanded) => {
    const next = new Map(get().panelExpanded)
    next.set(key, expanded)
    set({ panelExpanded: next })
  },
  resetExpanded: () => set({ panelExpanded: new Map() })
}))

/** 当前数据源（实时数据或某条历史）。 */
export function selectCurrentRoot(s: ReturnType<typeof useHistoryStore.getState>): LogCheckContext | null {
  if (s.selectedIndex === LIVE_INDEX) return s.liveRoot
  return s.history[s.selectedIndex] ?? null
}
