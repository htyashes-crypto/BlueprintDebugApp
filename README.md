# BlueprintDebug

ActFramework `BlueprintInterpreterLog` 的跨进程实时调试器（Electron + React + TypeScript），让开发者在 Unity Editor 或打包游戏中都能实时查看蓝图执行日志树。

## 功能

- 实时连接 Unity 调试桥（WebSocket），看到蓝图函数的嵌套执行日志
- 历史面板：最多 50 条快照，倒序展示，可搜索
- 日志树：递归卡片，独立展开/收纳，命中关键词黄色加粗高亮
- 复制：单层 / 带子级
- 离线 Dump：从 Unity Editor 导出的 `*.bp-dump.json` 文件加载（支持拖拽）
- 应用菜单（文件 / 视图 / 帮助）+ 全局快捷键（`Ctrl+R/L/F/K`、`Ctrl+O/W`、`Ctrl+Shift+C`、`Esc`）
- Toast 通知 + 重连倒计时 + 长名字悬浮提示 + Welcome 引导页
- 自动重连：指数退避 1/2/4/8/16/30s
- GitHub 自动更新：检测 Release 新版本（仓库待配置）

## 启动开发环境

```bash
# 1. 安装依赖（首次）
cd BlueprintDebugApp
npm install

# 2. 启动 dev 模式（带热更新）
npm run dev
```

## 打包

### 1. 生成应用图标（首次或图标变更后）

```bash
npm run icons:generate
```

此脚本调用 `electron-icon-builder`，从 `resources/icon.svg` 生成 `icon.png` / `icon.ico` / `icon.icns`。
不跑也能构建，但会缺图标。详见 [resources/README.md](resources/README.md) 备选生成方式。

### 2. 平台打包

```bash
# Windows（NSIS + portable）
npm run build:win

# macOS（dmg arm64 + x64）
npm run build:mac

# 仅 Mac arm64（Apple Silicon）
npm run build:mac-arm
```

构建产物输出到 `dist/`。

### macOS 签名

未签名的 .app 在他人 Mac 上打开会被 Gatekeeper 拦截。临时绕过：右键打开 → 信任。
正式分发需 Apple Developer ID 签名，参考 electron-builder 文档 `mac.identity` 配置。

## 端到端验证（与 Unity 配合）

### 自动发现连接（推荐）

桌面 App 通过 **`~/.blueprint-debug/discovery.json`** 共享文件零配置发现 Unity，**打包游戏也无需复制 Token**。

1. **Unity 侧准备**（一次性）：
   - DebugCfg → 调试桥分区，勾"总开关"+"自动启动"
   - 把 `BlueprintDebugBridgeLifecycle` 加入 ModuleCfg 静态配置
2. **启动 Unity**：进入 Play Mode 或运行打包游戏，Console 输出：
   ```
   [Blueprint DebugBridge] 服务启动：ws://127.0.0.1:17900/bp-debug/v1  token=xxx
   [Blueprint DebugBridge] Discovery 文件已写入：C:\Users\<user>\.blueprint-debug\discovery.json
   ```
3. **桌面 App**：`npm run dev` 启动，App 自动读 discovery.json → 自动填 host/port/token → 自动连接
4. **触发蓝图**：在 Unity 中执行任意蓝图函数，桌面 App 应在 50ms 内看到历史新增 + 实时数据增量
5. **跟随重启**：Unity 关闭再开（pid/token 变了）→ 桌面 App 3 秒内自动跟随新会话

### 手动连接（备选）

如不想用自动发现：顶栏点"断开"后改为手动模式。粘贴 token → "连接"。token 来源：

- Editor：菜单 `ActFramework/Blueprint/调试桥/复制 Token 到剪贴板`
- Player：游戏日志（开发版本可见 ConsoleLogger / 持久化日志文件）

### 离线 Dump 模式

1. Unity 菜单 `ActFramework/Blueprint/调试桥/导出调试 Dump` → 选保存路径（默认 `*.bp-dump.json`）
2. 桌面 App 加载 dump 的三种方式（任选）：
   - 顶栏"📂 打开 Dump"按钮 → 文件选择对话框
   - 应用菜单 `文件 → 打开 Dump…`（快捷键 `Ctrl/Cmd+O`）
   - **直接拖拽 .json 文件到窗口**
3. 进入离线模式后顶部出现紫色 banner，显示 dump 文件名 / 记录数 / 导出时间 / 协议版本
4. 历史面板自动填入 dump 内容，点击任一条查看树形
5. 点击 banner 右侧"× 关闭 Dump"或快捷键 `Ctrl/Cmd+W` 回到实时模式
6. 在离线模式下点"连接"会自动清离线数据并切回实时

## 协议

详见 plan 文件中"协议规范"章节。简言之：

- WebSocket `ws://127.0.0.1:17900/bp-debug/v1`
- 帧封套 `{ type, seq, data }`，UTF-8 JSON
- 鉴权：客户端首条 `auth { token }`，5s 超时
- 心跳：服务端 15s ping，60s 静默断连

## GitHub 自动更新（Phase 6）

仓库：`htyashes-crypto/BlueprintDebugApp`（已配置在 `electron-builder.yml`）

### 用户体验流程

桌面 App 启动后（仅打包版本生效，dev 模式跳过）：

1. 自动调 `autoUpdater.checkForUpdates()` → GitHub Releases API
2. 检测到新版本 → 弹 **UpdateModal**：版本号 + Release notes + "立即更新 / 稍后"
3. 点"立即更新" → 后台下载 .exe / .dmg，进度条实时更新
4. 下载完成 → 切换到"立即重启安装 / 稍后"
5. 点"稍后"则下次应用退出时自动安装（`autoInstallOnAppQuit=true`）

也可通过 **菜单 → 帮助 → 检查更新…** 主动触发；主动触发时无新版本会 toast 提示，错误也会显示在 UpdateModal。

### 发布新版本（开发者侧）

每次发布前：

1. **改版本号**：`package.json` 的 `version` 字段（如 `0.1.0` → `0.1.1`）。这是 electron-updater 的对比基准。
2. **生成图标**（首次或图标变更后）：
   ```bash
   npm run icons:generate
   ```
3. **设置环境变量**（一次性，已配过可跳过）：
   ```bash
   # PowerShell（持久）
   [Environment]::SetEnvironmentVariable('GH_TOKEN', 'ghp_xxx', 'User')
   
   # 当前会话临时
   $env:GH_TOKEN = 'ghp_xxx'
   ```
   PAT 需勾 `public_repo`（或仓库私有时勾 `repo`）+ `workflow` 权限。
4. **构建 + 发布**：
   ```bash
   npm run release
   ```
   `electron-builder --publish always` 会：
   - 在 GitHub 上**自动建 Release**（草稿状态）
   - 上传 .exe / .dmg / `latest.yml` / `latest-mac.yml` 等更新元信息
5. **填写 Release Notes 并 Publish**：
   - 浏览器打开 `https://github.com/htyashes-crypto/BlueprintDebugApp/releases`
   - 找到刚生成的草稿 Release → 编辑 → 在 description 写更新内容（中文 markdown 即可）
   - **重要**：description 内容会在桌面 App 的 UpdateModal 里展示给所有用户
   - 点 "Publish release"

### Release Notes 格式建议

UpdateModal 用 `<pre>` 渲染（保留换行 + 等宽），不解析 markdown，所以建议：

```text
本次更新（v0.1.1）

新功能：
  · 支持拖拽多个 .json 同时加载
  · 状态栏增加内存占用显示

修复：
  · 重连倒计时偶尔卡住的问题
  · macOS 下窗口最小化恢复后字体糊的问题

破坏性变更：
  · 协议帧 type "ping" 改为 "heartbeat"，需配合 Unity 端 v0.2+
```

### 常见问题排查

| 现象 | 原因 / 解决 |
|---|---|
| `npm run release` 提示 401 Unauthorized | `GH_TOKEN` 未设置或权限不足，重新生成带 `public_repo` 的 PAT |
| 用户没收到更新通知 | App 启动时 GitHub Releases API 限流（60次/小时未鉴权），等几分钟再试 |
| 下载到 99% 卡住 | 通常是杀软扫描 .exe，关闭防护或加入白名单 |
| 用户版本号 ≥ Release 版本号 | electron-updater 不会"降级"，本地 `package.json` version 必须 < Release tag |

## 工程结构

```
src/
├── main/index.ts           # Electron 主进程：BrowserWindow + IPC + 自动更新
├── preload/index.ts        # contextBridge 受限 API
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx        # React 入口
        ├── App.tsx         # 顶层组装 + 网络客户端集成
        ├── models/         # LogCheckContext / LogCheckEntry / ConnectionState
        ├── network/        # DebugBridgeProtocol / Client / Reconnector
        ├── stores/         # Zustand：connection / history
        ├── services/       # SearchService / DumpFileLoader / LiveContextBuilder
        ├── components/     # MacTitleBar / TopBar / HistoryPanel / Toolbar / LogTreeView ...
        └── styles/globals.css
```

## 调色板（与 SVG mockup 对齐）

| 用途 | 颜色 |
|---|---|
| 主背景 | `#1e1e1e` |
| 顶栏渐变 | `#323233 → #2d2d2d` |
| 左栏 | `#252525` |
| 卡片 | `#2d2d2d` |
| 边框 | `#3e3e3e` / `#555` |
| 主文字 | `#cccccc` |
| 弱文字 | `#888` |
| 高亮（搜索命中） | `#ffd700` |
| 强调（连接） | `#0098ff` / `#9cdcfe` |
| 状态栏 | `#0078d4` |
| 实时增量 | `#4ec9b0` |
| 危险 | `#a1260d` |

## 开发常见命令

```bash
npm run typecheck    # TypeScript 静态检查
npm run dev          # 开发模式（热更新）
npm run build        # 构建（不打包）
npm run preview      # 预览构建产物
```
