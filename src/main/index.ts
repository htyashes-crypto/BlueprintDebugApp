import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import Store from 'electron-store'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { installApplicationMenu } from './menu'

/** 调试桥发现文件路径，与 Unity 侧 BlueprintDebugBridgeDiscovery 严格对齐。 */
const DISCOVERY_PATH = join(homedir(), '.blueprint-debug', 'discovery.json')

/** 读取 Discovery 文件；不存在或解析失败均返回 null。 */
async function readDiscoveryFile(): Promise<unknown | null> {
  try {
    const st = await stat(DISCOVERY_PATH)
    if (!st.isFile()) return null
    const text = await readFile(DISCOVERY_PATH, 'utf-8')
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** 持久化设置：连接历史、窗口尺寸、上次 token 等。 */
interface AppSettings {
  windowBounds?: { width: number; height: number; x?: number; y?: number }
  lastConnection?: { host: string; port: number; token: string }
  recentDumpDir?: string
}

const store = new Store<AppSettings>({
  name: 'blueprint-debug-app-settings',
  defaults: { windowBounds: { width: 1220, height: 820 } }
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const bounds = store.get('windowBounds') ?? { width: 1220, height: 820 }
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    title: 'BlueprintDebug',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1e1e1e',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', () => {
    if (mainWindow) {
      const b = mainWindow.getBounds()
      store.set('windowBounds', b)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // dev 模式自动开 DevTools 方便看 WebSocket / 控制台错误
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.actframework.blueprint-debug-app')

  ipcMain.handle('settings:get', (_e, key: keyof AppSettings) => store.get(key))
  ipcMain.handle('settings:set', (_e, key: keyof AppSettings, value: unknown) => {
    store.set(key, value as never)
    return true
  })

  ipcMain.handle('dump:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '打开蓝图调试 Dump',
      properties: ['openFile'],
      filters: [
        { name: 'Blueprint Dump', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]
    const text = await readFile(path, 'utf-8')
    return { path, text }
  })

  ipcMain.handle('discovery:read', () => readDiscoveryFile())
  ipcMain.handle('discovery:path', () => DISCOVERY_PATH)

  ipcMain.handle('updater:checkNow', () => autoUpdater.checkForUpdates())

  // Phase 6 — GitHub 自动更新事件全套转发到 renderer，由 UpdateModal 决定 UI
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:checking')
  })
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:available', info)
  })
  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('updater:notAvailable', info)
  })
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:progress', progress)
  })
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:downloaded', info)
  })
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:error', { message: err?.message ?? String(err) })
  })
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall())

  installApplicationMenu(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // 仅打包后才尝试自检；dev 跳过避免 latest.yml 缺失刷错
  // 使用 checkForUpdates（非 AndNotify）让事件全走 UpdateModal，不依赖 OS 通知
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {
      // GitHub 仓库未配置或网络不可达时静默
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
