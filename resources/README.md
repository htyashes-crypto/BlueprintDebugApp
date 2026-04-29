# 应用图标资源

`electron-builder` 在打包时从这里读取应用图标与 dmg 背景。本目录已提供 `icon.svg`（矢量源），需要在第一次打包前生成对应平台的位图：

## 必备文件

| 文件 | 平台 | 推荐尺寸 |
|---|---|---|
| `icon.png` | 共用（Linux/Win 备份） | 512×512 或 1024×1024 |
| `icon.ico` | Windows 安装包与可执行文件 | 多分辨率 (256/128/64/48/32/16) |
| `icon.icns` | macOS .app 包 | 多分辨率 (16-1024) |

> 缺失时 `electron-builder` 会 warning 但仍能构建，dev 模式不受影响。

## 生成方法

### 一键生成（推荐）：electron-icon-builder

```bash
npm i -D electron-icon-builder
npx electron-icon-builder --input=resources/icon.svg --output=resources --flatten
```

会同时输出 `icon.png` / `icon.ico` / `icon.icns`。

### 在线工具

1. 访问 https://www.icoconverter.com / https://cloudconvert.com
2. 上传 `resources/icon.svg`
3. 分别导出 png（512×512）/ ico（多分辨率）/ icns
4. 放回 `resources/` 目录

### macOS 命令行（仅 Mac 可用）

```bash
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
rm -rf icon.iconset
```

## 替换图标

修改 `icon.svg` 后，重跑生成脚本即可。`electron-builder.yml` 通过 `directories.buildResources: resources` 自动找到本目录。
