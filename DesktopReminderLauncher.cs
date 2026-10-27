using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class DesktopReminderLauncher
{
    [STAThread]
    private static void Main()
    {
        try
        {
            string folder = AppDomain.CurrentDomain.BaseDirectory;
            string script = Path.Combine(folder, "DesktopReminder.ps1");
            if (!File.Exists(script))
            {
                MessageBox.Show("找不到 DesktopReminder.ps1。", "桌面提醒",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Windows),
                    @"System32\WindowsPowerShell\v1.0\powershell.exe"),
                Arguments = "-NoProfile -STA -ExecutionPolicy Bypass -File \"" + script + "\"",
                WorkingDirectory = folder,
                UseShellExecute = true,
                WindowStyle = ProcessWindowStyle.Normal
            };

            Process.Start(startInfo);
        }
        catch (Exception ex)
        {
            MessageBox.Show("启动失败：" + ex.Message, "桌面提醒",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
