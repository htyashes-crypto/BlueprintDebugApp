import { useHistoryStore } from '../stores/historyStore'

interface DumpBannerProps {
  onCloseDump: () => void
}

/**
 * 离线 Dump 模式横幅：当 historyStore.dumpInfo 非空时显示，渲染在 TopBar 与左右两栏之间。
 * 紫色高亮以与实时连接（蓝色调）区分；右侧提供"关闭 Dump"快捷按钮。
 */
export function DumpBanner({ onCloseDump }: DumpBannerProps): JSX.Element | null {
  const info = useHistoryStore((s) => s.dumpInfo)
  if (!info) return null

  const exportedDate = new Date(info.exportedAt)
  const dateStr =
    `${exportedDate.getFullYear()}-${pad2(exportedDate.getMonth() + 1)}-${pad2(exportedDate.getDate())} ` +
    `${pad2(exportedDate.getHours())}:${pad2(exportedDate.getMinutes())}:${pad2(exportedDate.getSeconds())}`

  return (
    <div className="h-9 bg-gradient-to-r from-purple-900/60 to-purple-800/40 border-b border-purple-500/40 flex items-center px-4 gap-3 text-2xs">
      <span className="text-purple-200 font-medium">📂 离线 Dump 模式</span>
      <span className="text-fg-base font-mono truncate max-w-[400px]" title={info.filePath}>
        {info.fileName}
      </span>
      <span className="text-fg-mute">·</span>
      <span className="text-fg-mute">{info.recordCount} 条历史</span>
      <span className="text-fg-mute">·</span>
      <span className="text-fg-mute">导出于 {dateStr}</span>
      <span className="text-fg-mute">·</span>
      <span className="text-fg-mute">协议 v{info.version}</span>
      <div className="flex-1" />
      <button
        className="bp-mini-btn px-3 py-1 text-2xs hover:brightness-110"
        onClick={onCloseDump}
        title="关闭 dump 文件，回到实时模式"
      >
        × 关闭 Dump
      </button>
    </div>
  )
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}
