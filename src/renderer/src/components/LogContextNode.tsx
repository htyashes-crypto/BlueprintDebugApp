import { useMemo } from 'react'
import type { LogCheckContext } from '../models/LogCheckContext'
import { LogCheckEntryType, type LogCheckEntry } from '../models/LogCheckEntry'
import { useHistoryStore } from '../stores/historyStore'
import { isMatch, hasMatchInChildren } from '../services/SearchService'
import { HighlightedText } from './HighlightedText'

interface LogContextNodeProps {
  ctx: LogCheckContext
  depth: number
  pathKey: string
}

/**
 * 单张日志卡片；递归渲染。与 SVG 中卡片：bg-#2d2d2d border-#3e3e3e rounded-md，每层缩进 8px。
 * 头部：[展开/收纳] + 高亮 name + 总日志/子调用计数 + 复制 + 复制带子级。
 * 折叠态显示首条日志预览（灰色斜体）。
 */
export function LogContextNode({ ctx, depth, pathKey }: LogContextNodeProps): JSX.Element {
  const { searchTopText, searchMode, panelExpanded, setExpanded } = useHistoryStore((s) => ({
    searchTopText: s.searchTopText,
    searchMode: s.searchMode,
    panelExpanded: s.panelExpanded,
    setExpanded: s.setExpanded
  }))

  const counts = useMemo(() => computeCounts(ctx), [ctx])
  const hasChildren = (ctx.children?.length ?? 0) > 0 || hasChildEntries(ctx)
  const hasLogs = (ctx.logs?.length ?? 0) > 0 || hasLogEntries(ctx)
  const canExpand = hasChildren || hasLogs

  const stored = panelExpanded.get(pathKey)
  const childMatched = searchTopText ? hasMatchInChildren(ctx, searchTopText, searchMode) : false
  const isExpanded = stored ?? false
  const finalExpanded = canExpand && (isExpanded || (searchTopText && childMatched))

  if (searchTopText) {
    if (!isMatch(ctx, searchTopText, searchMode) && !childMatched) return <></>
  }

  const indent = depth * 8

  return (
    <div style={{ paddingLeft: indent }}>
      <div className="bp-card mb-1.5">
        {/* 头部行 */}
        <div className="flex items-center px-2.5 py-1.5 gap-2">
          <button
            className="bp-mini-btn w-12 disabled:opacity-50"
            disabled={!canExpand}
            onClick={() => setExpanded(pathKey, !isExpanded)}
          >
            {finalExpanded ? '收纳' : '展开'}
          </button>
          <HighlightedText
            text={ctx.name || '(无名称)'}
            query={searchTopText}
            className="text-fg-base text-sm font-semibold flex-1 min-w-0 truncate"
          />
          {canExpand && (
            <span className="text-fg-mute text-2xs whitespace-nowrap">
              总日志 {counts.logs} | 子调用 {counts.children}
            </span>
          )}
          <button
            className="bp-mini-btn px-2.5 py-0.5"
            onClick={() => copyCurrentLayer(ctx)}
            title="复制当前层"
          >
            📋 复制
          </button>
          <button
            className="bp-mini-btn px-2.5 py-0.5"
            onClick={() => copyWithChildren(ctx)}
            title="复制当前层及全部子层"
          >
            📋 带子级复制
          </button>
        </div>

        {/* 折叠预览 */}
        {!finalExpanded && (
          <div className="px-2.5 pb-1.5 -mt-0.5 text-fg-mute text-2xs italic font-mono truncate">
            {buildPreview(ctx)}
          </div>
        )}

        {/* 展开内容 */}
        {finalExpanded && <ExpandedBody ctx={ctx} depth={depth} pathKey={pathKey} />}
      </div>
    </div>
  )
}

function ExpandedBody({ ctx, depth, pathKey }: { ctx: LogCheckContext; depth: number; pathKey: string }): JSX.Element {
  const searchTopText = useHistoryStore((s) => s.searchTopText)
  const searchMode = useHistoryStore((s) => s.searchMode)
  const showLogQuery = searchMode === 'name+logs' ? searchTopText : ''

  const useEntries = (ctx.entries?.length ?? 0) > 0
  return (
    <div className="px-2.5 pb-2 pt-0.5 space-y-1">
      {useEntries
        ? ctx.entries!.map((e, i) => renderEntry(e, i, depth, `${pathKey}/e${i}`, showLogQuery))
        : <>
            {(ctx.logs ?? []).map((log, i) => (
              <div key={`l${i}`} className="font-mono text-xs text-fg-base whitespace-pre-wrap break-all">
                <HighlightedText text={log} query={showLogQuery} />
              </div>
            ))}
            {(ctx.children ?? []).map((c, i) => (
              <LogContextNode key={`c${i}`} ctx={c} depth={depth + 1} pathKey={`${pathKey}/c${i}`} />
            ))}
          </>
      }
    </div>
  )
}

function renderEntry(entry: LogCheckEntry, idx: number, depth: number, key: string, query: string): JSX.Element {
  if (entry.entryType === LogCheckEntryType.Log) {
    return (
      <div key={key} className="font-mono text-xs text-fg-base whitespace-pre-wrap break-all">
        <HighlightedText text={entry.log ?? ''} query={query} />
      </div>
    )
  }
  if (entry.entryType === LogCheckEntryType.Child && entry.child) {
    return <LogContextNode key={key} ctx={entry.child} depth={depth + 1} pathKey={key} />
  }
  return <div key={key} />
}

function computeCounts(ctx: LogCheckContext): { logs: number; children: number } {
  let logs = 0
  let children = 0
  if (ctx.entries && ctx.entries.length > 0) {
    for (const e of ctx.entries) {
      if (e.entryType === LogCheckEntryType.Log) logs++
      else if (e.entryType === LogCheckEntryType.Child && e.child) {
        children++
        const nested = computeCounts(e.child)
        logs += nested.logs
        children += nested.children
      }
    }
  } else {
    logs += ctx.logs?.length ?? 0
    if (ctx.children) {
      for (const c of ctx.children) {
        children++
        const nested = computeCounts(c)
        logs += nested.logs
        children += nested.children
      }
    }
  }
  return { logs, children }
}

function hasChildEntries(ctx: LogCheckContext): boolean {
  return !!ctx.entries?.some((e) => e.entryType === LogCheckEntryType.Child)
}

function hasLogEntries(ctx: LogCheckContext): boolean {
  return !!ctx.entries?.some((e) => e.entryType === LogCheckEntryType.Log)
}

function buildPreview(ctx: LogCheckContext): string {
  if (ctx.entries && ctx.entries.length > 0) {
    const log = ctx.entries.find((e) => e.entryType === LogCheckEntryType.Log)
    if (log?.log) return log.log
    const childCount = ctx.entries.filter((e) => e.entryType === LogCheckEntryType.Child).length
    if (childCount > 0) return `含 ${childCount} 条子调用`
  } else {
    if (ctx.logs?.[0]) return ctx.logs[0]
    if (ctx.children?.length) return `含 ${ctx.children.length} 条子调用`
  }
  return '(无日志)'
}

function copyCurrentLayer(ctx: LogCheckContext): void {
  const sb: string[] = []
  sb.push(`[${ctx.name}]`)
  if (ctx.entries && ctx.entries.length > 0) {
    for (const e of ctx.entries) {
      if (e.entryType === LogCheckEntryType.Log && e.log) sb.push(e.log)
    }
  } else if (ctx.logs) {
    for (const l of ctx.logs) sb.push(l)
  }
  navigator.clipboard.writeText(sb.join('\n'))
}

function copyWithChildren(ctx: LogCheckContext): void {
  navigator.clipboard.writeText(formatTree(ctx, 0))
}

function formatTree(ctx: LogCheckContext, indent: number): string {
  const pad = '  '.repeat(indent)
  const lines: string[] = [`${pad}[${ctx.name}]`]
  if (ctx.entries && ctx.entries.length > 0) {
    for (const e of ctx.entries) {
      if (e.entryType === LogCheckEntryType.Log && e.log) lines.push(`${pad}  ${e.log}`)
      else if (e.entryType === LogCheckEntryType.Child && e.child) lines.push(formatTree(e.child, indent + 1))
    }
  } else {
    for (const l of ctx.logs ?? []) lines.push(`${pad}  ${l}`)
    for (const c of ctx.children ?? []) lines.push(formatTree(c, indent + 1))
  }
  return lines.join('\n')
}
