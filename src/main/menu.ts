import { app, Menu, MenuItemConstructorOptions, BrowserWindow, shell } from 'electron'

/**
 * 应用菜单命令通道：发给 renderer，由 App.tsx onMenuCommand 路由到具体业务 handler。
 * 与 preload bp.onMenuCommand 对齐。
 */
export const MenuChannel = 'menu:command'

/** 渲染端可识别的菜单命令字符串。 */
export type MenuCommand =
  | 'open-dump'
  | 'close-dump'
  | 'toggle-history-panel'
  | 'refresh'
  | 'clear-live'
  | 'connect-toggle'
  | 'check-for-update'
  | 'about'

/** 安装应用菜单；Mac 显示 dock 菜单，Win 启用菜单栏。 */
export function installApplicationMenu(getWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'
  const send = (cmd: MenuCommand): void => getWindow()?.webContents.send(MenuChannel, cmd)

  const macAppMenu: MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      { role: 'about', label: '关于 BlueprintDebug' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide', label: '隐藏 BlueprintDebug' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: '退出' }
    ]
  }

  const fileMenu: MenuItemConstructorOptions = {
    label: '文件',
    submenu: [
      {
        label: '打开 Dump…',
        accelerator: 'CmdOrCtrl+O',
        click: () => send('open-dump')
      },
      {
        label: '关闭 Dump',
        accelerator: 'CmdOrCtrl+W',
        click: () => send('close-dump')
      },
      { type: 'separator' },
      {
        label: '连接 / 断开调试桥',
        accelerator: 'CmdOrCtrl+Shift+C',
        click: () => send('connect-toggle')
      },
      { type: 'separator' },
      isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' }
    ]
  }

  const viewMenu: MenuItemConstructorOptions = {
    label: '视图',
    submenu: [
      {
        label: '切换历史面板',
        accelerator: 'CmdOrCtrl+L',
        click: () => send('toggle-history-panel')
      },
      {
        label: '刷新（拉取历史）',
        accelerator: 'CmdOrCtrl+R',
        click: () => send('refresh')
      },
      {
        label: '清空实时数据',
        accelerator: 'CmdOrCtrl+K',
        click: () => send('clear-live')
      },
      { type: 'separator' },
      { role: 'reload', label: '重载渲染进程' },
      { role: 'forceReload', label: '强制重载' },
      { role: 'toggleDevTools', label: '切换开发者工具' },
      { type: 'separator' },
      { role: 'resetZoom', label: '实际大小' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '全屏' }
    ]
  }

  const helpMenu: MenuItemConstructorOptions = {
    label: '帮助',
    submenu: [
      {
        label: '检查更新…',
        click: () => send('check-for-update')
      },
      {
        label: '在 GitHub 上查看',
        click: () => shell.openExternal('https://github.com')
      },
      { type: 'separator' },
      {
        label: '关于 BlueprintDebug',
        click: () => send('about')
      }
    ]
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),
    fileMenu,
    viewMenu,
    helpMenu
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
