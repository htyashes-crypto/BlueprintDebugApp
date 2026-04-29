import type { LogCheckEntry } from './LogCheckEntry'

/**
 * 与 Unity 侧 DebugContextNode 对齐的日志树节点。
 * entries 与 logs+children 双路兼容：渲染时 entries 优先，无 entries 时按 logs+children 合成。
 */
export interface LogCheckContext {
  name: string
  /** Unix 毫秒时间戳。 */
  timestamp: number
  entries?: LogCheckEntry[]
  logs?: string[]
  children?: LogCheckContext[]
}

/** 把 timestamp 格式化为 HH:mm:ss，与 BlueprintDebugWindow 历史项一致。 */
export function formatContextTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
