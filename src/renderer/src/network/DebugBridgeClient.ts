import {
  buildWebSocketUrl,
  Envelope,
  MessageType,
  AuthResultData,
  HistorySnapshotData,
  ContextEndedData,
  LogAddedData,
  ClearedData,
  HeartbeatData,
  ErrorData
} from './DebugBridgeProtocol'

/** 客户端事件回调集合；外部按需订阅。 */
export interface DebugBridgeClientHandlers {
  onStateChange?: (state: 'connecting' | 'authenticating' | 'ready' | 'closed' | 'failed') => void
  onAuthResult?: (data: AuthResultData) => void
  onHistorySnapshot?: (data: HistorySnapshotData) => void
  onContextEnded?: (data: ContextEndedData) => void
  onLogAdded?: (data: LogAddedData) => void
  onCleared?: (data: ClearedData) => void
  onError?: (data: ErrorData) => void
  onPongLatencyMs?: (latency: number) => void
  onMessageCounts?: (recv: number, sent: number) => void
}

interface ConnectOptions {
  host: string
  port: number
  token: string
  topics: string[]
  handlers: DebugBridgeClientHandlers
}

/** WebSocket 客户端封装：连接 → auth → subscribe → 接收循环 → 心跳。 */
export class DebugBridgeClient {
  private m_socket: WebSocket | null = null
  private m_handlers: DebugBridgeClientHandlers = {}
  private m_options: ConnectOptions | null = null
  private m_pingTimer: number | null = null
  private m_lastPingSentTs = 0
  private m_recvCount = 0
  private m_sentCount = 0

  get isOpen(): boolean { return this.m_socket?.readyState === WebSocket.OPEN }

  connect(options: ConnectOptions): void {
    this.disconnect()
    this.m_options = options
    this.m_handlers = options.handlers
    this.m_recvCount = 0
    this.m_sentCount = 0

    const url = buildWebSocketUrl(options.host, options.port)
    console.log('[DebugBridge] connecting →', url, 'token=', options.token ? options.token.slice(0, 8) + '…' : '(empty)')
    this.m_handlers.onStateChange?.('connecting')
    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch (e) {
      console.error('[DebugBridge] WebSocket 构造失败：', e)
      this.m_handlers.onStateChange?.('failed')
      this.m_handlers.onError?.({ code: 'CONNECT_FAILED', message: String(e) })
      return
    }
    this.m_socket = socket

    socket.onopen = () => {
      console.log('[DebugBridge] WebSocket 已 OPEN，发送 auth')
      this.m_handlers.onStateChange?.('authenticating')
      this.send({ type: MessageType.Auth, data: { token: options.token } })
    }
    socket.onmessage = (ev) => {
      console.log('[DebugBridge] ◀ message:', typeof ev.data === 'string' ? ev.data.slice(0, 200) : '(non-string)')
      this.handleMessage(ev.data)
    }
    socket.onclose = (ev) => {
      console.warn('[DebugBridge] WebSocket CLOSE code=' + ev.code + ' reason=' + (ev.reason || '(empty)') + ' wasClean=' + ev.wasClean)
      this.stopPing()
      this.m_handlers.onStateChange?.('closed')
    }
    socket.onerror = (ev) => {
      console.error('[DebugBridge] WebSocket ERROR', ev)
      this.m_handlers.onStateChange?.('failed')
    }
  }

  disconnect(): void {
    this.stopPing()
    if (this.m_socket && this.m_socket.readyState !== WebSocket.CLOSED) {
      try { this.m_socket.close() } catch { /* 已关 */ }
    }
    this.m_socket = null
  }

  /** 通用发送；其他业务方法（请求历史、清空）封装在下面。 */
  send(envelope: Envelope): void {
    if (!this.isOpen) return
    const text = JSON.stringify(envelope)
    this.m_socket!.send(text)
    this.m_sentCount++
    this.m_handlers.onMessageCounts?.(this.m_recvCount, this.m_sentCount)
  }

  requestHistory(): void {
    this.send({ type: MessageType.RequestHistory })
  }

  subscribe(topics: string[]): void {
    this.send({ type: MessageType.Subscribe, data: { topics } })
  }

  clear(scope: 'live' | 'history' | 'all'): void {
    const type =
      scope === 'live' ? MessageType.ClearLive :
      scope === 'history' ? MessageType.ClearHistory :
      MessageType.ClearAll
    this.send({ type })
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return
    let envelope: Envelope
    try { envelope = JSON.parse(raw) }
    catch { return }
    this.m_recvCount++
    this.m_handlers.onMessageCounts?.(this.m_recvCount, this.m_sentCount)

    switch (envelope.type) {
      case MessageType.AuthResult: {
        const data = envelope.data as AuthResultData
        this.m_handlers.onAuthResult?.(data)
        if (data?.ok) {
          this.m_handlers.onStateChange?.('ready')
          this.subscribe(this.m_options?.topics ?? ['live', 'history'])
          this.requestHistory()
          this.startPing()
        }
        break
      }
      case MessageType.Pong: {
        const data = envelope.data as HeartbeatData
        if (this.m_lastPingSentTs > 0) {
          const latency = Date.now() - this.m_lastPingSentTs
          this.m_handlers.onPongLatencyMs?.(latency)
        }
        void data
        break
      }
      case MessageType.HistorySnapshot:
        this.m_handlers.onHistorySnapshot?.(envelope.data as HistorySnapshotData)
        break
      case MessageType.ContextEnded:
        this.m_handlers.onContextEnded?.(envelope.data as ContextEndedData)
        break
      case MessageType.LogAdded:
        this.m_handlers.onLogAdded?.(envelope.data as LogAddedData)
        break
      case MessageType.Cleared:
        this.m_handlers.onCleared?.(envelope.data as ClearedData)
        break
      case MessageType.Error:
        this.m_handlers.onError?.(envelope.data as ErrorData)
        break
      default: break
    }
  }

  private startPing(): void {
    this.stopPing()
    this.m_pingTimer = window.setInterval(() => {
      if (!this.isOpen) return
      this.m_lastPingSentTs = Date.now()
      this.send({ type: MessageType.Ping, data: { ts: this.m_lastPingSentTs } })
    }, 15000)
  }

  private stopPing(): void {
    if (this.m_pingTimer != null) {
      window.clearInterval(this.m_pingTimer)
      this.m_pingTimer = null
    }
  }
}
