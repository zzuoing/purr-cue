# 开发说明

## 1. 技术栈与入口

- 平台：Windows 10/11
- UI：C# WinForms
- 运行时：.NET Framework 4.x
- 正式入口：`DesktopReminderApp.cs`
- 正式主程序：`桌面提醒.exe`
- 构建脚本：`build.ps1`

`DesktopReminder.ps1`、`DesktopReminderLauncher.cs` 和 `启动桌面提醒.vbs` 是早期实现与启动方案，当前正式版本不依赖它们。保留这些文件仅用于追溯，不应在新功能中同时维护两套逻辑。

## 2. 目录说明

```text
desktop-reminder/
├─ DesktopReminderApp.cs       正式应用源码
├─ build.ps1                   可重复构建脚本
├─ README.md                   用户使用说明
├─ DEVELOPMENT.md              开发与维护说明
├─ assets/
│  ├─ cat-head.ico             窗口、托盘和可执行文件图标
│  ├─ cat-head.png             图标源图
│  └─ stretch.gif              拉伸场景正式动画资源
├─ concepts/                   动画方案、渲染器与历史导出帧
├─ DesktopReminder.ps1         早期 PowerShell 版本
├─ DesktopReminderLauncher.cs  早期启动器
└─ 启动桌面提醒.vbs           早期启动脚本
```

`concepts` 用于保留动画设计过程。正式程序的大部分场景由 `DesktopReminderApp.cs` 中的 GDI+ 绘制代码实时生成；目前只有拉伸场景直接读取 `assets/stretch.gif`。

## 3. 核心结构

### `ReminderItem`

提醒数据模型：

- `Id`：提醒唯一标识。
- `When`：一次提醒的日期时间，或重复提醒的每日时间。
- `Message`：提醒文字，同时用于场景关键词匹配。
- `RepeatDays`：星期编号列表，`0` 为周日，`1` 至 `6` 为周一至周六；空列表表示一次提醒。
- `Enabled`：是否仍可触发。
- `LastTriggeredDate`：重复提醒最近触发日期，防止同一天重复播放。

### `ReminderForm`

主窗口负责创建、展示和删除提醒，每 15 秒检查到期状态，管理 JSON 数据、托盘菜单及开机启动。

一次提醒触发时先设为不可再次触发，动画窗口关闭后再从集合和 JSON 文件中删除。重复提醒保留在列表中，并更新 `LastTriggeredDate`。

### `AnimalReminderForm`

无边框、置顶、分层透明的动画窗口。窗口覆盖主屏幕底部 250 像素，通过 `UpdateLayeredWindow` 输出带 Alpha 的位图。

- 动画计时器间隔：33 ms。
- 单击窗口或按 `Esc` 可提前结束。
- `popupOpen` 保证同一时刻只播放一个提醒。
- 提示框宽度按文字实测尺寸自动调整，字号保持固定。

### `DesktopReminderProgram`

应用入口与单实例控制。普通启动使用互斥量 `Local\ZuoJiahuiDesktopReminderV2`；`--preview` 模式绕过单实例限制，便于开发时单独查看动画。

## 4. 提醒生命周期

### 一次提醒

1. 保存时要求时间晚于当前时间。
2. 到期后 24 小时内均可触发，用于处理关机或程序未运行的情况。
3. 触发前将 `Enabled` 设为 `false`，避免重复弹出。
4. 动画自然结束、被单击关闭或按 `Esc` 关闭后，删除该提醒并保存数据。

### 重复提醒

1. 至少选择一个星期。
2. 到期后 6 小时内可触发。
3. 用 `LastTriggeredDate` 保证当天只触发一次。
4. 周一至周五完整选中时，列表显示为“工作日”。

## 5. 场景选择

场景匹配位于 `AnimalReminderForm` 构造函数中，按从上到下的顺序判断：如厕、下班、上班、散步、拉伸、吃饭、喝水、透气、通用场景。

新增或修改关键词时要注意顺序，避免一条提醒同时包含多个关键词时进入意外场景。

## 6. 构建

在项目目录执行：

```powershell
.\build.ps1
```

脚本优先使用：

```text
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
```

如果 64 位编译器不存在，会回退到 `Framework` 目录。构建产物位于 `dist`，不会覆盖正在运行的正式程序。

## 7. 动画预览

构建后可以绕过主界面直接预览：

```powershell
.\dist\DesktopReminder.exe --preview 上班
.\dist\DesktopReminder.exe --preview 透气
.\dist\DesktopReminder.exe --preview 喝水
.\dist\DesktopReminder.exe --preview 吃饭
.\dist\DesktopReminder.exe --preview 拉伸
.\dist\DesktopReminder.exe --preview 散步
.\dist\DesktopReminder.exe --preview 如厕
.\dist\DesktopReminder.exe --preview 下班
```

预览参数仍经过正常关键词匹配，因此也可以传入完整提醒句子。

## 8. 新增场景

1. 在 `SceneKind` 中增加枚举值。
2. 在构造函数的关键词判断中增加匹配规则。
3. 在 `RenderScene` 中增加绘制分支。
4. 实现绘制函数；需要位图或 GIF 时放入 `assets`，不要从临时目录读取。
5. 在 `Animate` 中设置结束条件，避免动画永久占用屏幕。
6. 在快捷按钮数组、README 场景表和预览清单中同步更新。
7. 使用 `--preview` 检查不同屏幕宽度、透明边缘、提示框和动画结束行为。

## 9. 数据与兼容性

数据文件：

```text
%LOCALAPPDATA%\DesktopReminder\reminders-v2.json
```

保存时先写入 `.tmp`，再替换正式文件。读取异常时复制为 `.broken-时间戳` 备份。修改 `ReminderItem` 时应保留旧字段兼容性；新增集合字段应在 `LoadReminders` 中补默认值。

## 10. 检查清单

每次修改后至少检查：

1. `build.ps1` 无错误完成。
2. 主窗口可启动，第二次普通启动会提示已有实例。
3. 八个快捷状态均可用 `--preview` 打开。
4. 动画边缘透明，没有洋红色或不透明矩形边。
5. 提示框对短文字收窄，对长文字扩展且不超出屏幕。
6. 一次提醒关闭后从列表与 JSON 中删除。
7. 重复提醒当天只触发一次，周一至周五显示“工作日”。
8. 关闭主窗口后托盘仍运行，托盘“退出”能真正结束进程。
9. 勾选和取消开机启动后，注册表项正确增删。

## 11. 已知限制

- 当前只按主屏幕工作区定位，不支持选择显示器。
- 关机超过 24 小时的一次提醒不会补弹。
- 多个同时到期提醒按列表顺序依次播放，没有队列管理界面。
- 场景主要集中在单个源码文件中；继续增加动画时宜逐步拆分为独立渲染类。
- 未设置自动化测试，动画效果仍需人工视觉检查。

## 12. 发布步骤

1. 更新 README 和本开发文档中的行为说明。
2. 执行 `build.ps1`。
3. 按检查清单完成预览与主程序验证。
4. 将 `dist\DesktopReminder.exe` 与 `dist\assets` 一并分发。
5. 提交源码、文档和必要的正式资源；不要提交 `dist`、调试程序或概念渲染器生成的可执行文件。

