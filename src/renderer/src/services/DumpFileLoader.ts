import type { LogCheckContext } from '../models/LogCheckContext'

/** Unity 侧 BlueprintDebugDumpExporter 写入的格式。 */
export interface DumpFileBody {
  version: string
  exportedAt: number
  history: LogCheckContext[]
}

/** 解析 Dump JSON；失败抛错由调用方处理。 */
export function parseDumpText(text: string): DumpFileBody {
  const body = JSON.parse(text) as DumpFileBody
  if (!body || !Array.isArray(body.history)) {
    throw new Error('无效的 Dump 文件：缺少 history 字段')
  }
  return body
}
