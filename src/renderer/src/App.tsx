import { useEffect, useMemo, useRef } from 'react'
import { MacTitleBar } from './components/MacTitleBar'
import { TopBar } from './components/TopBar'
import { HistoryPanel } from './components/HistoryPanel'
import { Toolbar } from './components/Toolbar'
import { LogTreeView } from './components/LogTreeView'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/ToastContainer'
import { DumpBanner } from './components/DumpBanner'
import { UpdateModal } from './components/UpdateModal'
import { useUpdateStore, type UpdateInfo, type UpdateProgress } from './stores/updateStore'
import { useKeyboardShortcuts } from './components/useKeyboardShortcuts'
import { useConnectionStore } from './stores/connectionStore'
import { useHistoryStore } from './stores/historyStore'
import { ConnectionState } from './models/ConnectionState'
import { DebugBridgeClient } from './network/DebugBridgeClient'
import { DebugBridgeReconnector } from './network/DebugBridgeReconnector'
import { parseDumpText } from './services/DumpFileLoader'
import { applyLogAdded } from './services/LiveContextBuilder'
import { toast } from './stores/toastStore'

export function App(): JSX.Element {
  const clientRef = useRef<DebugBridgeClient | null>(null)
  const reconnectorRef = useRef<DebugBridgeReconnector>(new DebugBridgeReconnector())

  const conn = useConnectionStore()
  const hist = useHistoryStore()

  /** 用户最近一次的连接意图：true=希望连接 / false=主动断开（避免被自动重连骚扰）。 */
  const userWantsConnectRef = useRef(true)
  /** Unity 进程标识；token 变更或 pid 变更时认为是新会话，强制重连。 */
  const lastDiscoveryRef = useRef<{ pid: number; token: string } | null>(null)

  // 启动时还原上次连接信息 + 读 discovery 自动连接
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const last = (await window.bp.getSetting('lastConnection')) as
        | { host?: string; port?: number; token?: string }
        | undefined
      if (last && !cancelled) {
        conn.setParams({
          host: last.host ?? '127.0.0.1',
          port: last.port ?? 17900,
          token: last.token ?? ''
        })
      }
      const discovery = await window.bp.readDiscovery()
      if (cancelled) return
      if (discovery && discovery.token) {
        applyDiscoveryAndConnect(discovery)
      }
    })()

    // Phase 6 — 自动更新事件订阅；UpdateModal 根据 updateStore 状态机渲染
    const offChecking = window.bp.onUpdateChecking(() => {
      const m = useUpdateStore.getState()
      if (m.state === 'idle' || m.state === 'error') m.setState('checking')
    })
    const offAvail = window.bp.onUpdateAvailable((info) => {
      const m = useUpdateStore.getState()
      m.setInfo(info as UpdateInfo)
      m.setState('available')
    })
    const offNot = window.bp.onUpdateNotAvailable(() => {
      const m = useUpdateStore.getState()
      if (m.manuallyTriggered) toast.info('已是最新版本')
      m.setState('idle')
      m.setManuallyTriggered(false)
    })
    const offProgress = window.bp.onUpdateProgress((p) => {
      const m = useUpdateStore.getState()
      m.setProgress(p as UpdateProgress)
      if (m.state !== 'downloading') m.setState('downloading')
    })
    const offDone = window.bp.onUpdateDownloaded((info) => {
      const m = useUpdateStore.getState()
      m.setInfo(info as UpdateInfo)
      m.setState('downloaded')
    })
    const offErr = window.bp.onUpdateError((err) => {
      const m = useUpdateStore.getState()
      m.setError(err.message)
      // 启动时静默（仓库未发布 / 网络问题不打扰用户），手动触发时弹错误 UI
      if (m.manuallyTriggered) {
        m.setState('error')
        m.setManuallyTriggered(false)
      } else {
        m.setState('idle')
      }
    })
    return () => {
      cancelled = true
      offChecking()
      offAvail()
      offNot()
      offProgress()
      offDone()
      offErr()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 用 Discovery 信息覆盖连接参数并发起连接；同时记录指纹避免重复触发。 */
  const applyDiscoveryAndConnect = (info: NonNullable<Awaited<ReturnType<typeof window.bp.readDiscovery>>>): void => {
    lastDiscoveryRef.current = { pid: info.pid, token: info.token }
    conn.setParams({ host: info.host, port: info.port, token: info.token })
    void window.bp.setSetting('lastConnection', { host: info.host, port: info.port, token: info.token })
    if (hist.dumpInfo) {
      hist.setDumpInfo(null)
      hist.setHistory([])
      hist.setLiveRoot(null)
      hist.setSelectedIndex(-1)
    }
    reconnectorRef.current.reset()
    conn.setReconnectAttempt(0)
    conn.setNextAttemptAt(null)
    userWantsConnectRef.current = true
    doConnect()
  }

  // 周期 poll discovery：未连接 + 用户希望连 → 自动连；token/pid 变 → 重连
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!userWantsConnectRef.current) return
      void (async () => {
        const info = await window.bp.readDiscovery()
        if (!info || !info.token) return
        const last = lastDiscoveryRef.current
        const sessionChanged = !last || last.pid !== info.pid || last.token !== info.token
        const state = useConnectionStore.getState().state
        if (state === ConnectionState.Disconnected || state === ConnectionState.Failed) {
          applyDiscoveryAndConnect(info)
        } else if (state === ConnectionState.Ready && sessionChanged) {
          // Unity 重启了（新 pid / 新 token），跟随重连
          toast.info('Unity 已重启', `跟随到新会话 (pid ${info.pid})`)
          handleDisconnect()
          applyDiscoveryAndConnect(info)
        }
      })()
    }, 3000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const client = useMemo(() => {
    if (!clientRef.current) clientRef.current = new DebugBridgeClient()
    return clientRef.current
  }, [])

  const handleConnect = (): void => {
    userWantsConnectRef.current = true
    const params = conn.params
    if (!params.token) {
      // 优先尝试 discovery 文件，找不到再提示
      void window.bp.readDiscovery().then((info) => {
        if (info && info.token) {
          applyDiscoveryAndConnect(info)
        } else {
          toast.warning('未找到 Unity', '请确认 DebugCfg 调试桥总开关已勾选并进入 Play Mode')
        }
      })
      return
    }
    // 用户从 dump 模式发起连接，先清离线数据
    if (hist.dumpInfo) {
      hist.setDumpInfo(null)
      hist.setHistory([])
      hist.setLiveRoot(null)
      hist.setSelectedIndex(-1)
    }
    void window.bp.setSetting('lastConnection', params)
    reconnectorRef.current.reset()
    conn.setReconnectAttempt(0)
    conn.setNextAttemptAt(null)
    doConnect()
  }

  const doConnect = (): void => {
    conn.setNextAttemptAt(null)
    const params = useConnectionStore.getState().params
    client.connect({
      host: params.host,
      port: params.port,
      token: params.token,
      topics: ['live', 'history'],
      handlers: {
        onStateChange: (st) => {
          if (st === 'connecting') conn.setState(ConnectionState.Connecting)
          else if (st === 'authenticating') conn.setState(ConnectionState.Authenticating)
          else if (st === 'ready') {
            conn.setState(ConnectionState.Ready)
            reconnectorRef.current.reset()
            conn.setReconnectAttempt(0)
            conn.setNextAttemptAt(null)
            toast.success('已连接到调试桥', `${params.host}:${params.port}`)
          } else if (st === 'closed') {
            const wasReady = useConnectionStore.getState().state === ConnectionState.Ready
            conn.setState(ConnectionState.Disconnected)
            if (wasReady) toast.warning('连接已断开', '尝试自动重连…')
            scheduleReconnect()
          } else if (st === 'failed') {
            conn.setState(ConnectionState.Failed)
            scheduleReconnect()
          }
        },
        onAuthResult: (data) => {
          if (data.ok) conn.setServerVersion(data.serverVersion ?? '')
          else {
            const reason = data.reason ?? '鉴权失败'
            conn.setLastError(reason)
            toast.error('鉴权失败', reason)
          }
        },
        onHistorySnapshot: (data) => {
          hist.setHistory(data.history ?? [])
        },
        onContextEnded: (data) => {
          if (data.context) {
            hist.prependHistory(data.context)
            hist.setLiveRoot(null)
          }
        },
        onLogAdded: (data) => {
          const next = applyLogAdded(useHistoryStore.getState().liveRoot, data.stackPath, data.entry)
          hist.setLiveRoot(next)
        },
        onCleared: (data) => {
          hist.clear(data.scope)
          toast.info('已清空', `范围：${data.scope}`)
        },
        onError: (data) => {
          const text = `${data.code}: ${data.message}`
          conn.setLastError(text)
          toast.error('调试桥错误', text)
        },
        onPongLatencyMs: (latency) => conn.setPing(latency),
        onMessageCounts: (recv, sent) => conn.setCounts(recv, sent)
      }
    })
  }

  const scheduleReconnect = (): void => {
    const params = useConnectionStore.getState().params
    if (!params.token) return
    conn.setState(ConnectionState.Reconnecting)
    const delay = reconnectorRef.current.schedule(() => {
      conn.setReconnectAttempt(reconnectorRef.current.attempt)
      doConnect()
    })
    conn.setNextAttemptAt(Date.now() + delay)
  }

  const handleDisconnect = (): void => {
    userWantsConnectRef.current = false
    reconnectorRef.current.cancel()
    client.disconnect()
    conn.setState(ConnectionState.Disconnected)
    conn.setReconnectAttempt(0)
    conn.setNextAttemptAt(null)
  }

  const handleClear = (): void => {
    if (conn.state === ConnectionState.Ready) {
      client.clear('live')
    } else {
      hist.clear('live')
      toast.info('已清空实时数据')
    }
  }

  const handleRefresh = (): void => {
    if (conn.state === ConnectionState.Ready) {
      client.requestHistory()
      toast.info('已请求历史', '稍候片刻接收 history-snapshot')
    } else {
      toast.warning('未连接，无法刷新')
    }
  }

  const loadDumpFromText = (filePath: string, text: string): boolean => {
    try {
      const body = parseDumpText(text)
      handleDisconnect()
      hist.setHistory(body.history)
      hist.setSelectedIndex(body.history.length > 0 ? body.history.length - 1 : -1)
      hist.setLiveRoot(null)
      hist.setDumpInfo({
        filePath,
        fileName: filePath.split(/[\\/]/).pop() ?? filePath,
        version: body.version,
        exportedAt: body.exportedAt,
        recordCount: body.history.length
      })
      conn.setLastError(null)
      toast.success('Dump 已加载', `${body.history.length} 条历史记录`)
      return true
    } catch (e) {
      const msg = `Dump 解析失败：${(e as Error).message}`
      conn.setLastError(msg)
      toast.error('Dump 解析失败', (e as Error).message)
      return false
    }
  }

  const handleOpenDump = async (): Promise<void> => {
    const result = await window.bp.openDumpFile()
    if (!result) return
    loadDumpFromText(result.path, result.text)
  }

  const handleCloseDump = (): void => {
    hist.setDumpInfo(null)
    hist.setHistory([])
    hist.setLiveRoot(null)
    hist.setSelectedIndex(-1)
    toast.info('已关闭 Dump，回到实时模式')
  }

  const handleRetryReconnectNow = (): void => {
    reconnectorRef.current.cancel()
    conn.setNextAttemptAt(null)
    conn.setReconnectAttempt(reconnectorRef.current.attempt + 1)
    doConnect()
  }

  // 卸载时清理 socket
  useEffect(() => {
    return () => {
      reconnectorRef.current.cancel()
      client.disconnect()
    }
  }, [client])

  // 主进程菜单命令路由（与 main/menu.ts MenuCommand 字符串严格对齐）
  useEffect(() => {
    const off = window.bp.onMenuCommand((cmd) => {
      switch (cmd) {
        case 'open-dump': void handleOpenDump(); break
        case 'close-dump': handleCloseDump(); break
        case 'toggle-history-panel': hist.toggleHistoryPanel(); break
        case 'refresh': handleRefresh(); break
        case 'clear-live': handleClear(); break
        case 'connect-toggle':
          if (conn.state === ConnectionState.Ready) handleDisconnect()
          else handleConnect()
          break
        case 'check-for-update': {
          const m = useUpdateStore.getState()
          m.setManuallyTriggered(true)
          m.setError(null)
          m.setState('checking')
          void window.bp.checkForUpdate()
          break
        }
        case 'about':
          toast.info('BlueprintDebug v0.1.0', 'ActFramework 蓝图调试桥外置桌面应用')
          break
      }
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.state])

  // 全局键盘快捷键
  useKeyboardShortcuts({
    onRefresh: handleRefresh,
    onToggleHistoryPanel: hist.toggleHistoryPanel,
    onFocusSearch: () => {
      const el = document.getElementById('bp-top-search') as HTMLInputElement | null
      el?.focus()
      el?.select()
    },
    onClearLive: handleClear,
    onToggleConnect: () => {
      if (conn.state === ConnectionState.Ready) handleDisconnect()
      else handleConnect()
    },
    onEscape: () => {
      if (conn.state === ConnectionState.Reconnecting) handleDisconnect()
    }
  })

  // 拖拽 .json 文件加载 dump
  const onDragOver = (e: React.DragEvent): void => {
    if (Array.from(e.dataTransfer.items).some((it) => it.kind === 'file')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }
  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.warning('仅支持 .json dump 文件', `当前文件：${file.name}`)
      return
    }
    file.text()
      .then((text) => loadDumpFromText((file as File & { path?: string }).path ?? file.name, text))
      .catch((err) => toast.error('读取文件失败', String(err)))
  }

  return (
    <div
      className="flex flex-col h-full bg-bg-base text-fg-base font-ui"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <MacTitleBar />
      <TopBar onConnect={handleConnect} onDisconnect={handleDisconnect} onOpenDump={handleOpenDump} />
      <DumpBanner onCloseDump={handleCloseDump} />
      <div className="flex-1 flex min-h-0">
        {hist.showHistoryPanel && <HistoryPanel />}
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar onClear={handleClear} onRefresh={handleRefresh} />
          <LogTreeView />
        </div>
      </div>
      <StatusBar
        onReconnectCancel={handleDisconnect}
        onReconnectRetryNow={handleRetryReconnectNow}
      />
      <ToastContainer />
      <UpdateModal
        onDownload={() => {
          useUpdateStore.getState().setState('downloading')
          void window.bp.downloadUpdate()
        }}
        onInstall={() => {
          void window.bp.installUpdate()
        }}
        onDismiss={() => {
          useUpdateStore.getState().setState('dismissed')
        }}
        onRetry={() => {
          const m = useUpdateStore.getState()
          m.setManuallyTriggered(true)
          m.setError(null)
          m.setState('checking')
          void window.bp.checkForUpdate()
        }}
      />
    </div>
  )
}
