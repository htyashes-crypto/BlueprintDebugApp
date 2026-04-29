import type { LogCheckContext } from '../models/LogCheckContext'
import { LogCheckEntryType, type LogCheckEntry } from '../models/LogCheckEntry'

/**
 * 接收 Unity 推送的 log-added 增量帧，按 stackPath 在实时根树上找到对应栈层，
 * 把 entry 追加到目标层 entries（同时维护 logs+children 双路兼容），返回新根。
 *
 * Phase 2 暂不接入（Unity 侧 hook 在 Phase 3 完成）；本文件先放骨架，
 * Phase 3 在 connection 收到 onLogAdded 时调 applyLogAdded 更新实时数据视图。
 */
export function applyLogAdded(
  root: LogCheckContext | null,
  stackPath: string[],
  entry: LogCheckEntry
): LogCheckContext | null {
  if (stackPath.length === 0 || !entry) return root

  const ensureRoot = (): LogCheckContext => {
    if (root && root.name === stackPath[0]) return root
    return { name: stackPath[0], timestamp: Date.now(), entries: [], logs: [], children: [] }
  }
  const newRoot = cloneContext(ensureRoot())

  let cursor: LogCheckContext = newRoot
  for (let i = 1; i < stackPath.length; i++) {
    const expected = stackPath[i]
    cursor = ensureChild(cursor, expected)
  }

  appendEntry(cursor, entry)
  return newRoot
}

/** 复制单层节点（不深复制子树），React 的 reference equality 用得上。 */
function cloneContext(ctx: LogCheckContext): LogCheckContext {
  return {
    name: ctx.name,
    timestamp: ctx.timestamp,
    entries: ctx.entries ? [...ctx.entries] : [],
    logs: ctx.logs ? [...ctx.logs] : [],
    children: ctx.children ? [...ctx.children] : []
  }
}

function ensureChild(parent: LogCheckContext, name: string): LogCheckContext {
  parent.entries ??= []
  parent.children ??= []
  for (const e of parent.entries) {
    if (e.entryType === LogCheckEntryType.Child && e.child?.name === name) return e.child
  }
  const child: LogCheckContext = { name, timestamp: Date.now(), entries: [], logs: [], children: [] }
  parent.entries.push({ entryType: LogCheckEntryType.Child, child })
  parent.children.push(child)
  return child
}

function appendEntry(target: LogCheckContext, entry: LogCheckEntry): void {
  target.entries ??= []
  target.entries.push(entry)
  if (entry.entryType === LogCheckEntryType.Log && entry.log) {
    target.logs ??= []
    target.logs.push(entry.log)
  } else if (entry.entryType === LogCheckEntryType.Child && entry.child) {
    target.children ??= []
    target.children.push(entry.child)
  }
}
