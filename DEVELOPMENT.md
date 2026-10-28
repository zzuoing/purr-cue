# 开发说明

## 技术栈与结构

Electron 45，Node.js 24+ 开发环境。主进程/preload 使用 CommonJS，界面与动画使用 ES modules；没有前端框架、数据库或后端依赖。日期面板使用 Flatpickr 4.6.13，随程序离线打包。

```text
src/
  main.cjs                  单实例、托盘、调度、窗口、开机启动
  reminders.cjs             验证、到期规则、旧格式导入、持久化
  preload.cjs               最小化 IPC 桥接
  localization.cjs          系统语言检测、语言偏好持久化、主进程翻译
  locales.json              中/英/日/韩文案
  i18n.js                   渲染器翻译和语言切换
  index.html / ui.js        保留旧布局的设置界面
  styles.css                原暖色系与尺寸
  date-time-picker.js        中文日历面板、小时分钟下拉、本地时间解析
  vendor/                   安装时生成的 Flatpickr JS/CSS/中文语言包和许可证
  overlay.html / overlay.js 透明动画窗口和播放生命周期
  overlay.css               提示框与 GIF 定位
  animation/
    scenes.js               原 C# 迁移的 44 个绘图/辅助函数
    graphics.js             GDI+ 概念到 Canvas 的兼容层
    player.js               场景分发、散步位置
    scenes-config.cjs       关键词、结束帧、间隔
assets/                     原始 GIF/图标、同造型高分辨率图标
legacy/                     冻结保留的旧版 Windows 实现
concepts/                   原有动画设计过程
scripts/                    检查、真实 Electron 验证、历史动画对照
test/                      提醒规则、迁移、持久化测试
.github/workflows/build.yml Windows/macOS/Linux 标签构建
```

正常运行、打包不使用旧 C#、Python 或 .NET。

## 国际化与版本

首次按系统语言选择 zh/en/ja/ko，其余回退 en；手动选择保存到稳定用户数据目录下的 settings.json，不随语言更换数据目录。界面、日期组件、托盘、窗口标题、验证提示均随选择更新；自定义提醒内容和未保存草稿不自动翻译。语言包键、占位符、各语言快捷状态与动画对应关系有自动测试。

快捷播放使用稳定场景 ID，显示和填入本地化名称；到期提醒仍通过四语言关键词识别场景。动画几何与播放参数不因语言变化而更改。

主进程从应用自身 package.json 读取产品版本，并通过 IPC 传给页脚与“关于”面板。scripts/set-version.cjs 严格验证 v 开头的语义版本标签，同步 package.json、lock 顶层和 lock 根包的版本；不改动依赖版本，不写回 Git。CI 在安装依赖前执行该步骤，确保安装程序元数据、文件名和 UI 显示相同。

`npm ci` 的 postinstall 会通过 prepare-vendor.cjs 复制固定版本 Flatpickr 到 src/vendor，启动和打包前也会同步，无 CDN 依赖。面板以 dialog 显示，保持原窗口尺寸；日历内联，小时/分钟使用 24 小时下拉列表。确认才提交到原编辑框，取消不改变输入值。一次/重复模式分别保存未提交的时间，键盘输入严格校验本地日期，避免无效日期被自动进位。

## 运行架构

主进程持有托盘、15 秒计时器和数据；设置窗口关闭后销毁，再打开时读取最新状态。所有窗口关闭不会退出主进程。

动画使用独立透明、无边框、置顶窗口，资源和首帧准备好后显示。位于主屏幕工作区底部，高 250 逻辑像素，Canvas 按 devicePixelRatio 设置分辨率。macOS 请求所有工作区及全屏空间显示，仍需实机验收。

动画期间注册 Esc，结束时注销。透明像素操作下层窗口，不透明区域和提示框允许点击关闭；GIF 使用图像矩形边界检测。

快捷状态继续填入编辑框，同时通过受校验的 quick-play IPC 立即替换当前动画，从头播放新选状态，不排队、不创建提醒。旧窗口同步销毁，兼容连续快速点击和窗口尚未加载的情况；被打断的一次提醒按既有关闭流程删除，其他提醒保留。

渲染器启用 sandbox/contextIsolation，关闭 nodeIntegration；preload 仅暴露业务接口。IPC 校验窗口和顶层页面来源；拒绝跳转、弹窗，CSP 禁止外部连接和脚本。后续联网需明确扩展边界。

## 提醒与数据

保留 Id / When / Message / RepeatDays / Enabled / LastTriggeredDate。新时间使用 ISO，导入接受 .NET /Date(milliseconds+offset)/。星期 0=周日、1=周一至 6=周六。

一次提醒到期窗口为 [scheduled, scheduled + 24h)；重复提醒按本地日历和时间计算，窗口 [scheduled, scheduled + 6h)，使用本地日期去重。显示前保存触发状态，一次提醒关闭后删除，重复提醒保留。与原版一样，强制结束进程可能留下已经禁用的一次提醒。

保存先写 .tmp 后重命名替换，失败恢复内存状态。读取失败备份原文件，备份失败报错。Windows 首次导入保留旧文件与旧开机启动项。开发可用 --data-dir=绝对路径 隔离用户数据；--preview 内容 绕过数据和托盘。

## 动画一致性

九种场景均保留，拉伸沿用原 GIF，其余迁移绘图函数，没有替换为简化效果。

| 场景 | 可绘制帧 | 结束 |
| --- | --- | --- |
| 通用、透气、喝水、拉伸 | 0–360 | 第 361 次更新关闭 |
| 上班、吃饭 | 0–330 | 第 331 次更新关闭 |
| 下班 | 0–290 | 第 291 次更新关闭 |
| 如厕 | 0–285 | 第 286 次更新关闭 |
| 散步 | 随工作区宽度变化 | float32 每次加 3.2，超过宽度 + 210 关闭 |

保留 33 ms 更新节奏、整数除法、透明度截断、绘制顺序、路径、裁剪和变换。GDI+ 椭圆弧几何角转换为 Canvas 参数角。

一致性边界：场景、动作、几何、颜色、关键词、生命周期按原逻辑迁移；Canvas/GDI+ 抗锯齿、系统字体、GIF 解码调度和系统计时器不保证逐像素或任意机器的墙钟播放时间完全一致。macOS 中文字体使用系统回退，提示框需要实机检查。

## 验证

```sh
npm ci
npm run check
npm test
npm run verify:app
npm run verify:animation
```

verify:app 使用 work 独立数据目录，在真实 Electron 界面检查八个快捷状态、重复日期、工作日文案、真实 IPC 保存/删除、多提醒串行、Esc/点击关闭、一次提醒删除及界面释放/重新打开。不修改日常提醒或开机启动。

verify:animation 在 Chromium 中遍历 1280/1920 两种宽度的绘制帧，输出 272 张关键帧和绘图指令。GIF 不属于 Canvas 遍历，另以原资源一致性和播放检查验收。

Windows 原版独立对照需系统 .NET Framework 编译器和 Python：

```sh
python scripts/export-reference.py
python scripts/export-traces.py
npm run verify:animation
python scripts/compare-traces.py
```

原始帧和指令由旧 C# 函数独立计算，非 JS 反生成。输出位于 work，不进入发布包。对照绘制顺序、颜色、路径控制点、裁剪和变换；坐标容差为 0.02 逻辑像素，透明度字节必须一致。

本次 Windows 验证：13 项基础测试、真实界面检查通过，包含四语言切换/记忆、标题、日历、错误提示、版本显示、草稿保留、日期面板和提醒流程；动画迁移阶段的 5,870 帧 Canvas 渲染无脚本错误，272 组关键帧的 157,586 个数值对照通过，最大差异约 0.000158。图像仍存在渲染器边缘抗锯齿差异。

port-animation.py 是一次性历史迁移工具，会覆盖 scenes.js，日常不应随意执行。新动画直接维护 JS；旧 C# 冻结为参考，不双份开发。

## 打包与分发

```sh
npm run pack
npm run dist:win -- --publish never
npm run dist:linux -- --x64 --publish never
# macOS 上执行
npm run dist:mac -- --universal --publish never
```

Windows 目录包在 release/win-unpacked，NSIS、Linux AppImage/deb 均位于 release，文件名包含版本、平台、架构。macOS universal 包含 Intel/Apple Silicon。签名、公证凭据未配置，也没有自动更新功能。推送版本标签会在全部构建成功后公开发布 GitHub Release；PR 和手动构建仅上传 Actions 产物。

GitHub Actions 在 PR、v* 版本标签、手动触发时构建 Windows/macOS/Linux 并上传产物。标签通过 RELEASE_TAG 环境变量传入验证脚本，不插入 shell 命令；无效语义版本会终止构建。手动触发可选 tag，PR 使用当前文件版本。Linux runner 额外执行 Xvfb 的真实界面检查，并从最终 AppImage 检查产品版本与 UI。v2.0.1 已通过 GitHub Actions 三平台构建并发布 Release；macOS 打包成功不代表完成实机行为验收。

Release 作业依赖整个构建矩阵成功，使用 GitHub CLI 下载当前运行的安装包后发布，只有该作业授予 contents: write 和 actions: read。标签包含预发布后缀时标记为 Prerelease；重跑会覆盖同名附件。首次发布需先提交并推送代码和工作流，再推送版本标签；仅本地创建或修改文件不会触发远端 Actions。

Ubuntu WSL 下 scripts/build-linux-wsl.sh 可实际构建 AppImage/deb，使用 work/linux-build 隔离 Linux node_modules，并下载/校验 Node 24 到 work/linux-runtime，不更改已有 Node 安装。依赖锁文件一致时复用该隔离目录依赖；依赖变化时执行 npm ci。

正式分发前需真实 Windows/Mac 验收：安装和首次启动、单实例、九种动画透明边缘与完整动作、Retina/缩放、Dock/任务栏、工作区和全屏、睡眠唤醒和补弹、开机启动勾选取消、签名公证及干净机器安装。

Linux AppImage/deb 已在 Ubuntu WSL 实际构建，11 项测试与四语言/提醒/动画界面检查通过；最终 AppImage 的启动、产品版本、日期面板和 GIF 自然结束也已通过检查。Xvfb 测试采用软件渲染，测试进程使用 --no-sandbox（发布程序不默认附加这些测试参数）。Wayland 绝对定位、置顶和不同桌面的托盘仍需目标桌面实机验收。

## PurrCue 品牌、开源与 CLI

正式名称为 PurrCue；保留 com.zzuoing.desktop-reminder 与原用户数据目录，避免升级丢失提醒。默认 README 为英文，另有 zh-CN/ja/ko 版本。项目采用 MIT，第三方声明随应用分发。Windows NSIS 明确启用 en_US/zh_CN/ja_JP/ko_KR，英语放第一位作为不支持语言的默认值，显示语言选择框；安装语言与应用设置独立。macOS 声明四种本地化及英文开发语言。

CLI 源码为 bin/purrcue.cjs（无第三方依赖），本地可 node 调用或 npm link。安装包通过 extraResources 携带客户端，extraFiles 携带包装脚本，使用 Electron 的 Node 模式，无需单独安装 Node。AppImage 通过 --cli 子命令进入 src/entry.cjs 的客户端分支，绕过单实例锁和 GUI 初始化。服务端 src/cli-server.cjs 使用命名管道/Unix socket，仅接受 status/list/add/remove；随机令牌保存在用户数据 cli-connection.json，POSIX 权限 0600，无网络监听。添加/删除由主进程通过现有 ReminderStore 事务完成并通知 UI，不允许客户端直接改提醒文件。

CLI 会先只读探测状态，必要时后台启动应用；不重试结果未知的写操作，避免重复创建提醒。--data-dir 用于隔离测试。单元测试覆盖日期/星期校验、认证与共享存储；真实 Electron smoke 通过外部 CLI 进程验证增删和 UI 同步。Windows 与 Linux 最终包已验证独立运行时、自动启动、版本号、中日韩文本、一次/重复提醒及增删；macOS CLI 仍需实机验收。

Linux 主程序文件名为 purrcue-desktop，CLI 脚本为 purrcue，避免在 Windows/WSL 大小写不敏感磁盘上互相覆盖。AppImage extract-and-run 的外层运行时会向标准输出列出解压路径，可能与客户端 JSON 交错；验证器识别单条 CLI 协议响应，需要纯 JSON 的调用方应使用解包后的 CLI。macOS/Windows 的包内脚本没有这层解压输出。
