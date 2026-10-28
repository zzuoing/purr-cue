# 历史 Windows 实现

冻结保留 Electron 迁移前的实现，用于追溯和独立动画对照，不进入正式安装包。

DesktopReminderApp.cs 是原 WinForms 主程序，其余脚本和启动器属于早期实现。旧 EXE 和 build.ps1 按历史相对路径读取同级 assets；如需恢复运行，在独立目录复制这些文件及仓库根目录 assets 后再构建或启动。

不要与 Electron 版同时启用开机启动。当前开发、启动、打包使用仓库根目录 npm 命令。
