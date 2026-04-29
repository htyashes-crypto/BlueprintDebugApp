import type { LogCheckContext } from './LogCheckContext'

/** 与 Unity 侧 LogCheckEntryType 对齐：0 = 日志行，1 = 子上下文。 */
export const LogCheckEntryType = {
  Log: 0,
  Child: 1
} as const
export type LogCheckEntryType = typeof LogCheckEntryType[keyof typeof LogCheckEntryType]

/** 与 Unity 侧 DebugLogEntry 对齐；entryType=Log 看 log，entryType=Child 看 child。 */
export interface LogCheckEntry {
  entryType: LogCheckEntryType
  log?: string
  child?: LogCheckContext
}
