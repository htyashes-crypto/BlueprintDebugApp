import type { LogCheckContext } from '../models/LogCheckContext'
import { LogCheckEntryType } from '../models/LogCheckEntry'

/** 大小写不敏感的子串包含。 */
export function matches(text: string | undefined | null, query: string): boolean {
  if (!text) return false
  if (!query) return true
  return text.toLowerCase().includes(query.toLowerCase())
}

/** 节点本身是否命中（NameOnly 时只看 name）。 */
export function isMatch(ctx: LogCheckContext, query: string, mode: 'name' | 'name+logs'): boolean {
  if (!query) return true
  if (matches(ctx.name, query)) return true
  if (mode === 'name+logs') {
    if (ctx.entries) {
      for (const e of ctx.entries) {
        if (e.entryType === LogCheckEntryType.Log && matches(e.log, query)) return true
      }
    }
    if (ctx.logs) {
      for (const l of ctx.logs) {
        if (matches(l, query)) return true
      }
    }
  }
  return false
}

/** 子树（递归）是否含命中节点。 */
export function hasMatchInChildren(ctx: LogCheckContext, query: string, mode: 'name' | 'name+logs'): boolean {
  if (!query) return false
  if (ctx.entries) {
    for (const e of ctx.entries) {
      if (e.child) {
        if (isMatch(e.child, query, mode) || hasMatchInChildren(e.child, query, mode)) return true
      }
    }
  }
  if (ctx.children) {
    for (const c of ctx.children) {
      if (isMatch(c, query, mode) || hasMatchInChildren(c, query, mode)) return true
    }
  }
  return false
}

/** 把命中关键字包成 React-friendly 段：已匹配段 + 未匹配段；调用方按 isMatch flag 渲染高亮。 */
export interface HighlightSegment { text: string; matched: boolean }

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  if (!query || !text) return [{ text: text ?? '', matched: false }]
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const segments: HighlightSegment[] = []
  let cursor = 0
  while (cursor < text.length) {
    const idx = lower.indexOf(q, cursor)
    if (idx < 0) {
      segments.push({ text: text.substring(cursor), matched: false })
      break
    }
    if (idx > cursor) segments.push({ text: text.substring(cursor, idx), matched: false })
    segments.push({ text: text.substring(idx, idx + q.length), matched: true })
    cursor = idx + q.length
  }
  return segments
}
