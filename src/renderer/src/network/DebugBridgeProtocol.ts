import type { LogCheckContext } from '../models/LogCheckContext'
import type { LogCheckEntry } from '../models/LogCheckEntry'

/** 协议消息 type 字符串常量；与 Unity 侧 DebugBridgeMessageTypes 严格对齐。 */
export const MessageType = {
  // C → S
  Auth: 'auth',
  Subscribe: 'subscribe',
  RequestHistory: 'request-history',
  ClearLive: 'clear-live',
  ClearHistory: 'clear-history',
  ClearAll: 'clear-all',
  Ping: 'ping',
  // S → C
  AuthResult: 'auth-result',
  Pong: 'pong',
  HistorySnapshot: 'history-snapshot',
  ContextEnded: 'context-ended',
  LogAdded: 'log-added',
  Cleared: 'cleared',
  Error: 'error'
} as const
export type MessageType = typeof MessageType[keyof typeof MessageType]

/** 协议错误码常量；与 Unity 侧 DebugBridgeErrorCodes 对齐。 */
export const ErrorCode = {
  BadFrame: 'BAD_FRAME',
  Unauthenticated: 'UNAUTH',
  Backpressure: 'BACKPRESSURE',
  UnknownType: 'UNKNOWN_TYPE'
} as const

/** 帧统一封套；data 按 type 不同有不同结构，TS 端用泛型/any 透传。 */
export interface Envelope<T = unknown> {
  type: MessageType
  seq?: number
  data?: T
}

export interface AuthResultData {
  ok: boolean
  serverVersion?: string
  reason?: string
}

export interface HeartbeatData { ts: number }

export interface HistorySnapshotData {
  history: LogCheckContext[]
}

export interface ContextEndedData {
  context: LogCheckContext
}

export interface LogAddedData {
  stackPath: string[]
  entry: LogCheckEntry
}

export interface ClearedData {
  scope: 'live' | 'history' | 'all'
}

export interface ErrorData {
  code: string
  message: string
}

/** 构造 ws:// 端点 URL，与 Unity 侧 BlueprintDebugBridgeConfig.BuildWebSocketUrl 对齐。 */
export function buildWebSocketUrl(host: string, port: number): string {
  return `ws://${host}:${port}/bp-debug/v1`
}
