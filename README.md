# 桌面提醒

带小猫动画的桌面提醒工具，已迁移为 **Electron + JavaScript + HTML/CSS + Canvas**。保留原版界面布局、八个快捷状态、九种动画场景、一次提醒和按星期重复提醒。

## 开发运行

需要 Node.js 24+、npm 和图形桌面环境：

```sh
npm ci
npm start
```

首次启动可能下载官方 Electron 运行时。正常运行、打包无需 .NET、C# 编译器或 Python。

## 语言和版本

底部语言菜单支持中文、English、日本語、한국어；首次跟随系统语言，其他系统语言默认英语，手动选择会保存到用户数据目录的 `settings.json`。切换会更新界面、日历、托盘和提示信息，保留已输入的提醒内容。

快捷状态和手动提醒支持四种语言的关键词匹配。底部显示当前产品版本；CI 构建时自动采用版本标签，不使用 Electron 运行时的版本号。

## 使用

选择一次或重复提醒，设置时间和星期，输入内容或点击快捷状态，然后保存。关闭设置窗口会释放界面，后台调度和托盘继续运行；点击托盘重新打开，托盘“退出”才结束程序。

点击时间框或右侧日历按钮，弹出中文日期/时间面板：一次提醒可点选日期、今天或明天，再下拉选择小时和分钟；重复提醒仅选择时间。确认后写入编辑框，取消或按 Esc 保留原值。也可直接键盘输入 `YYYY-MM-DD HH:mm` 或 `HH:mm`。

点击快捷状态会在填入提醒内容的同时立即播放对应动画，不自动创建提醒。已有动画会立即关闭，新选动画从头播放；连续点击只保留最新选择，不排队。如果打断的是一次定时提醒，会按正常关闭流程删除该条提醒，其他提醒不受影响；仍可按原流程设置时间并保存提醒。

动画可单击或按 Esc 关闭。Esc 已被其他程序独占时仍可点击关闭；透明区域允许操作下层窗口。

## 动画

| 场景 | 关键词示例 |
| --- | --- |
| 上班 | 上班、开工、开始工作 |
| 透气 | 透气、通风、窗 |
| 喝水 | 喝水、饮水、补水 |
| 吃饭 | 吃饭、用餐、早餐、午饭、晚饭 |
| 拉伸 | 伸懒腰、拉伸、伸展 |
| 散步 | 走走、散步、活动、走动、出去 |
| 如厕 | 拉屎、如厕、厕所、便便 |
| 下班 | 下班、收拾、回家 |
| 通用 | 未匹配其他关键词 |

匹配优先级保持为：如厕 → 下班 → 上班 → 散步 → 拉伸 → 吃饭 → 喝水 → 透气 → 通用。

拉伸保留原始 assets/stretch.gif；其余保留绘制顺序、坐标、颜色、动作公式和 33 ms 更新间隔，改由 Canvas 绘制。GDI+ 与 Chromium 的抗锯齿、系统字体存在差异，不承诺逐像素相同。

开发预览不读写提醒数据，参数可换为任意快捷状态或内容：

```sh
npm run preview -- 上班
npm run preview -- 拉伸
```

## 提醒规则

- 每 15 秒检查到期提醒，系统唤醒时额外检查。
- 一次提醒必须设置未来时间，到期 24 小时内补弹，动画关闭后自动删除。
- 重复提醒按本地时间和所选星期触发，到期 6 小时内补弹，同一天只触发一次。
- 多条到期提醒依次处理，下一条在后续检查时触发。
- 动画显示在主屏幕工作区底部，高 250 逻辑像素。

## 数据与迁移

reminders-v2.json 保存在 Electron 用户数据目录：

| 系统 | 默认目录 |
| --- | --- |
| Windows | %APPDATA%/桌面提醒 |
| macOS | ~/Library/Application Support/桌面提醒 |
| Linux | $XDG_CONFIG_HOME/桌面提醒，通常为 ~/.config/桌面提醒 |

Windows 首次启动且新目录没有数据文件时，会导入旧版 %LOCALAPPDATA%/DesktopReminder/reminders-v2.json，转换 .NET 日期后保存到新目录，原文件保留。旧程序及其开机启动项不会自动删除；切换时请退出旧版，并在旧版中取消开机启动。

读取失败创建 .broken-时间戳 备份，并在界面说明。保存采用临时文件替换，失败回滚本次内存修改。

## 检查与打包

```sh
npm run check
npm test
npm run verify:app
npm run verify:animation
npm run pack
npm run dist:win
npm run dist:linux
```

在 Mac 上构建 Intel/Apple Silicon 通用包：

```sh
npm ci
npm run dist:mac -- --universal --publish never
```

## 标签构建 CI

先提交并推送项目代码，再推送版本标签：

```sh
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions 自动从标签读取 `1.0.1`，仅在 CI 工作目录同步修改 package.json 和 package-lock.json，再并行构建：

| 平台 | 产物 |
| --- | --- |
| Windows x64 | NSIS 安装程序 .exe |
| macOS Intel + Apple Silicon | universal .dmg / .zip |
| Linux x64 | .AppImage / .deb |

安装包文件名和界面版本统一使用标签版本。支持 `v1.0.1-beta.1`，无效标签会报错；不会自动提交版本修改。推送版本标签后，三个平台全部构建成功才会自动创建 GitHub Release 并附上安装包；带预发布后缀的标签会创建 Prerelease。重复运行会更新同一 Release 的安装包。在 Actions 对应运行的 Artifacts 中也能下载构建结果。保留 PR 检查，也可手动触发并选择构建版本；PR 和手动构建不会发布 Release。

本地可运行 `npm run version:tag -- v1.0.1` 同步版本（会修改本地版本文件）；常规本地打包沿用当前 package.json 的版本。产物位于 release/。WSL 用户可运行 `bash scripts/build-linux-wsl.sh`，它使用 work 下的隔离依赖与 Node 24 构建 Linux，不混用 Windows node_modules。

Windows 已本机运行和打包验证，Linux AppImage/deb 已在 Ubuntu WSL 实际构建；Linux CI 还会在 Xvfb 下检查界面和正式 AppImage。macOS 配置已准备，尚未在 Mac 上实机验收；正式分发仍需签名与公证。Linux Wayland 和不同桌面环境下的定位、置顶、托盘需要另做实机检查。

旧版保留在 legacy/，不进入 Electron 安装包。详见 [开发说明](DEVELOPMENT.md)。
