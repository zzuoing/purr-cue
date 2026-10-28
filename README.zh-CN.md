<div align="center">

<img src="assets/cat-head.png" width="112" alt="桌面提醒小猫">

# PurrCue

一只提醒你喝水、伸懒腰、休息一下的小猫。

[English](README.md) | **简体中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

[下载安装](https://github.com/zzuoing/purr-cue/releases/latest) · [JoyCows](https://joycows.com/) · [反馈问题](https://github.com/zzuoing/purr-cue/issues)

<img src="assets/stretch.gif" width="360" alt="小猫伸懒腰动画">

</div>

## 功能

- 提供 Windows、macOS、Linux 安装包，离线可用，提醒保存在本地。
- 支持一次提醒和按星期重复提醒。
- 八个快捷状态：上班、透气、喝水、吃饭、拉伸、散步、如厕、下班；其他内容使用通用动画。
- 快捷状态会填入文字并立即打断当前动画，播放所选动画；保存后才创建定时提醒，单纯预览不创建提醒。
- 日期时间面板、托盘控制、单实例运行和四语界面。

## 下载与安装

从 [最新版本](https://github.com/zzuoing/purr-cue/releases/latest) 下载安装包。

| 平台 | 安装包 | 安装方法 |
| --- | --- | --- |
| Windows x64 | `.exe` | 运行安装程序，选择语言和安装目录。 |
| macOS Intel / Apple Silicon | universal `.dmg` / `.zip` | 打开 DMG 拖入“应用程序”，或解压 ZIP。 |
| Linux x64 | `.AppImage` / `.deb` | 给 AppImage 添加执行权限后运行，或用包管理器安装 deb。 |

当前安装包未签名，未配置 macOS 公证。macOS 行为仍需实机验证；Linux 不同桌面环境、Wayland 合成器的窗口定位、置顶与托盘支持可能不同。应用内暂不支持 Linux 开机自启。

## 使用

1. 选择一次提醒，或选择重复提醒及星期。
2. 点击时间框或日历图标选择日期时间；也可手动输入 `YYYY-MM-DD HH:mm` / `HH:mm`。
3. 输入内容，或点击快捷状态预览动画，再保存为定时提醒。

动画显示在主屏幕工作区底部。点击动画或按 Esc 关闭，Esc 需要能注册为全局快捷键。关闭设置窗口后仍在托盘运行，请通过托盘菜单退出。

每 15 秒及系统唤醒后检查到期提醒。一次提醒在到期 24 小时内补弹，关闭后删除。重复提醒使用本地时间，在到期 6 小时内补弹，每个选定日期只触发一次。多条到期提醒在后续检查中依次处理。用快捷动画打断一次提醒时，该提醒按完成处理并删除，其他提醒保留。

## 语言

在窗口底部的**翻译图标旁切换语言**。首次启动跟随系统语言，不支持的语言默认英语，手动选择会保存。界面、日历、托盘及提醒关键词支持中、英、日、韩四语；不会自动翻译你输入的提醒内容。

Windows 安装向导有独立的四语选择器，初始跟随 Windows，不支持时回退英语。安装语言与应用内保存的语言互相独立。DMG、ZIP、AppImage、deb 没有同样的 Windows 安装向导，启动应用后按上述规则选择语言。

## 本地数据

`reminders-v2.json` 和 `settings.json` 保存在 Electron 用户数据目录。切换语言不会改变目录名 `桌面提醒`：

| 平台 | 默认目录 |
| --- | --- |
| Windows | `%APPDATA%/桌面提醒` |
| macOS | `~/Library/Application Support/桌面提醒` |
| Linux | `$XDG_CONFIG_HOME/桌面提醒`，通常为 `~/.config/桌面提醒` |

Windows 首次使用且没有新数据时导入 `%LOCALAPPDATA%/DesktopReminder/reminders-v2.json`，原文件保留。请自行退出旧版并关闭其开机启动。读取失败的文件备份为 `.broken-<时间戳>`，保存失败会回滚当前修改。目前没有账号、云同步或遥测功能。

## 开发

需要 Node.js 24+、npm 和图形桌面，Electron 首次使用可能下载运行时。

```sh
npm ci
npm start
npm run check
npm test
npm run verify:app
npm run dist:win
npm run dist:linux
# 在 macOS 上：
npm run dist:mac -- --universal --publish never
```

产物位于 `release/`。`npm run preview -- 拉伸` 可预览且不修改提醒数据。原程序保留在 `legacy/`，不进入安装包。保留原动画时序、几何与拉伸 GIF；字体渲染、抗锯齿可能与 GDI+ 不同。动画检查及 WSL 构建详见 [开发说明](DEVELOPMENT.md)。

## AI 助手 CLI

PurrCue 提供添加、查看、删除提醒的本地命令行。Windows 安装目录在 `PurrCue.exe` 旁提供 `purrcue.cmd`，可在该目录调用或将目录加入 PATH。macOS 提供 `PurrCue.app/Contents/purrcue`，Linux 解包目录在主程序旁提供 `purrcue`，这些启动器无需另装 Node。AppImage 使用 `./PurrCue-<版本>-linux-x86_64.AppImage --cli <命令>`，必要时先运行 `chmod +x`。

```sh
purrcue add --in 20m --message "Take a break" --json
purrcue add --at "2026-12-01 14:30" --message "Meeting" --json
purrcue add --time 09:00 --days mon,tue,wed,thu,fri --message "Start work" --json
purrcue list --json
purrcue remove <id> --json
purrcue status --json
```

源码中可用 `node bin/purrcue.cjs <命令>`，也可运行 `npm link` 将 `purrcue` 注册到 npm 命令目录。`--help` 查看全部选项。不带时区的日期使用本地时间。`--json` 向标准输出返回单个 `{ok,value}` 或 `{ok:false,error}` 对象，失败退出码为 1；提醒 ID 来自添加或列表结果。应用未启动时自动启动到托盘，`--no-launch` 禁止自动启动，`--data-dir <目录>` 使用隔离数据。应用必须保持运行才能触发提醒。

命令通过带认证的本机命名管道或 Unix socket 交给应用验证、保存并同步到界面，没有 HTTP 监听或远程接口。`cli-connection.json` 含本机访问令牌，请勿分享。

AppImage 的 extract-and-run 模式可能在 CLI 响应前后输出解压路径；AI 工具需要纯 JSON 标准输出时，请使用解包后的 `purrcue` 启动器。

## 发布

先提交并推送代码，再推送版本标签，例如 `v2.0.2`。GitHub Actions 验证标签后，在构建目录设置软件、安装包与界面版本，三平台全部通过后发布带安装包的 GitHub Release。`v2.0.2-beta.1` 等标签创建预发布。PR 和手动运行仅上传 Actions 产物，不发布 Release；CI 不会把版本修改提交回 Git。

## 协议与致谢

[MIT](LICENSE) · [第三方声明](THIRD_PARTY_NOTICES.md)。

README 组织方式参考 [BongoCat](https://github.com/ayangweb/BongoCat)。本项目保留自己的小猫动画和提醒逻辑，不包含 BongoCat 的代码或美术素材。
