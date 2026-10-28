param(
    [switch]$ValidateOnly
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$appName = '桌面提醒'
$appDir = Join-Path $env:LOCALAPPDATA 'DesktopReminder'
$dataFile = Join-Path $appDir 'reminders.json'
$startupDir = [Environment]::GetFolderPath('Startup')
$startupShortcut = Join-Path $startupDir '桌面提醒.lnk'
$launcherPath = Join-Path $PSScriptRoot '启动桌面提醒.vbs'

if (-not (Test-Path -LiteralPath $appDir)) {
    New-Item -ItemType Directory -Path $appDir -Force | Out-Null
}

function New-ReminderObject {
    param(
        [datetime]$When,
        [string]$Message,
        [int[]]$RepeatDays = @()
    )

    [pscustomobject]@{
        Id                = [guid]::NewGuid().ToString('N')
        When              = $When.ToString('o')
        Message           = $Message
        RepeatDays        = @($RepeatDays)
        Enabled           = $true
        LastTriggeredDate = $null
        CreatedAt         = (Get-Date).ToString('o')
    }
}

function Get-RepeatDays {
    param($Reminder)

    if ($null -ne $Reminder.PSObject.Properties['RepeatDays']) {
        return @($Reminder.RepeatDays | ForEach-Object { [int]$_ })
    }
    if ($null -ne $Reminder.PSObject.Properties['RepeatDaily'] -and [bool]$Reminder.RepeatDaily) {
        return @(0, 1, 2, 3, 4, 5, 6)
    }
    return @()
}

function Load-Reminders {
    if (-not (Test-Path -LiteralPath $dataFile)) {
        return [System.Collections.ArrayList]::new()
    }

    try {
        $raw = Get-Content -LiteralPath $dataFile -Raw -Encoding UTF8
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return [System.Collections.ArrayList]::new()
        }

        $items = @($raw | ConvertFrom-Json)
        $list = [System.Collections.ArrayList]::new()
        foreach ($item in $items) {
            [void]$list.Add($item)
        }
        return $list
    }
    catch {
        $backup = "$dataFile.broken-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -LiteralPath $dataFile -Destination $backup -Force
        return [System.Collections.ArrayList]::new()
    }
}

function Save-Reminders {
    param([System.Collections.IEnumerable]$Items)

    $array = @($Items)
    $json = if ($array.Count -eq 0) { '[]' } else { $array | ConvertTo-Json -Depth 5 }
    [System.IO.File]::WriteAllText($dataFile, $json, [System.Text.UTF8Encoding]::new($false))
}

function Set-AutoStart {
    param([bool]$Enabled)

    if ($Enabled) {
        if (-not (Test-Path -LiteralPath $launcherPath)) {
            throw '找不到启动文件。'
        }
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($startupShortcut)
        $shortcut.TargetPath = "$env:WINDIR\System32\wscript.exe"
        $shortcut.Arguments = '"' + $launcherPath + '"'
        $shortcut.WorkingDirectory = $PSScriptRoot
        $shortcut.Description = '桌面定时提醒'
        $shortcut.Save()
    }
    elseif (Test-Path -LiteralPath $startupShortcut) {
        Remove-Item -LiteralPath $startupShortcut -Force
    }
}

function Test-AutoStart {
    return Test-Path -LiteralPath $startupShortcut
}

if ($ValidateOnly) {
    $sample = New-ReminderObject -When (Get-Date).AddMinutes(5) -Message '测试提醒'
    if (-not $sample.Id -or -not $sample.When) {
        throw '提醒对象验证失败。'
    }
    Write-Output 'DesktopReminder validation passed.'
    exit 0
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, 'Local\ZuoJiahuiDesktopReminder', [ref]$createdNew)
if (-not $createdNew) {
    [System.Windows.Forms.MessageBox]::Show('桌面提醒已经在运行，请查看任务栏右下角托盘。', $appName) | Out-Null
    exit 0
}

$script:reminders = Load-Reminders
$script:allowExit = $false
$script:popupOpen = $false

function New-UiFont {
    param([float]$Size, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular)
    return New-Object System.Drawing.Font('Microsoft YaHei UI', $Size, $Style)
}

$mainForm = New-Object System.Windows.Forms.Form
$mainForm.Text = $appName
$mainForm.StartPosition = 'CenterScreen'
$mainForm.Size = New-Object System.Drawing.Size(610, 610)
$mainForm.MinimumSize = New-Object System.Drawing.Size(610, 610)
$mainForm.MaximumSize = New-Object System.Drawing.Size(610, 610)
$mainForm.BackColor = [System.Drawing.Color]::FromArgb(246, 248, 251)
$mainForm.Font = New-UiFont 9
$mainForm.Icon = [System.Drawing.SystemIcons]::Information

$header = New-Object System.Windows.Forms.Panel
$header.Dock = 'Top'
$header.Height = 70
$header.BackColor = [System.Drawing.Color]::FromArgb(45, 92, 138)
$mainForm.Controls.Add($header)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = '桌面提醒'
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.Font = New-UiFont 19 ([System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(22, 18)
$header.Controls.Add($titleLabel)

$script:mode = 'Once'
$modePanel = New-Object System.Windows.Forms.Panel
$modePanel.Location = New-Object System.Drawing.Point(20, 90)
$modePanel.Size = New-Object System.Drawing.Size(554, 46)
$modePanel.BackColor = [System.Drawing.Color]::FromArgb(232, 237, 243)
$mainForm.Controls.Add($modePanel)

$onceModeButton = New-Object System.Windows.Forms.Button
$onceModeButton.Text = '一次提醒'
$onceModeButton.FlatStyle = 'Flat'
$onceModeButton.FlatAppearance.BorderSize = 0
$onceModeButton.Size = New-Object System.Drawing.Size(268, 36)
$onceModeButton.Location = New-Object System.Drawing.Point(5, 5)
$modePanel.Controls.Add($onceModeButton)

$repeatModeButton = New-Object System.Windows.Forms.Button
$repeatModeButton.Text = '重复提醒'
$repeatModeButton.FlatStyle = 'Flat'
$repeatModeButton.FlatAppearance.BorderSize = 0
$repeatModeButton.Size = New-Object System.Drawing.Size(268, 36)
$repeatModeButton.Location = New-Object System.Drawing.Point(280, 5)
$modePanel.Controls.Add($repeatModeButton)

$editorPanel = New-Object System.Windows.Forms.Panel
$editorPanel.Location = New-Object System.Drawing.Point(20, 150)
$editorPanel.Size = New-Object System.Drawing.Size(554, 206)
$editorPanel.BackColor = [System.Drawing.Color]::White
$editorPanel.BorderStyle = 'FixedSingle'
$mainForm.Controls.Add($editorPanel)

$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = '提醒时间'
$timeLabel.AutoSize = $true
$timeLabel.Location = New-Object System.Drawing.Point(18, 16)
$editorPanel.Controls.Add($timeLabel)

$oncePicker = New-Object System.Windows.Forms.DateTimePicker
$oncePicker.CustomFormat = 'yyyy-MM-dd  HH:mm'
$oncePicker.Format = 'Custom'
$oncePicker.ShowUpDown = $true
$oncePicker.Width = 190
$oncePicker.Location = New-Object System.Drawing.Point(18, 40)
$oncePicker.Value = (Get-Date).AddMinutes(5)
$editorPanel.Controls.Add($oncePicker)

$repeatPicker = New-Object System.Windows.Forms.DateTimePicker
$repeatPicker.CustomFormat = 'HH:mm'
$repeatPicker.Format = 'Custom'
$repeatPicker.ShowUpDown = $true
$repeatPicker.Width = 100
$repeatPicker.Location = New-Object System.Drawing.Point(18, 40)
$repeatPicker.Value = (Get-Date -Hour 16 -Minute 0 -Second 0)
$editorPanel.Controls.Add($repeatPicker)

$dayLabel = New-Object System.Windows.Forms.Label
$dayLabel.Text = '重复日期'
$dayLabel.AutoSize = $true
$dayLabel.Location = New-Object System.Drawing.Point(18, 76)
$editorPanel.Controls.Add($dayLabel)

$script:selectedDays = [System.Collections.Generic.HashSet[int]]::new()
$script:dayButtons = @()
$dayTexts = @('一', '二', '三', '四', '五', '六', '日')
$dayValues = @(1, 2, 3, 4, 5, 6, 0)
for ($i = 0; $i -lt 7; $i++) {
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $dayTexts[$i]
    $button.Tag = $dayValues[$i]
    $button.FlatStyle = 'Flat'
    $button.Size = New-Object System.Drawing.Size(42, 32)
    $button.Location = New-Object System.Drawing.Point((18 + $i * 48), 98)
    $button.Add_Click({
        param($sender, $eventArgs)
        $day = [int]$sender.Tag
        if ($script:selectedDays.Contains($day)) {
            [void]$script:selectedDays.Remove($day)
            $sender.BackColor = [System.Drawing.Color]::White
            $sender.ForeColor = [System.Drawing.Color]::FromArgb(45, 55, 65)
        }
        else {
            [void]$script:selectedDays.Add($day)
            $sender.BackColor = [System.Drawing.Color]::FromArgb(45, 92, 138)
            $sender.ForeColor = [System.Drawing.Color]::White
        }
    })
    $editorPanel.Controls.Add($button)
    $script:dayButtons += $button
}

$messageLabel = New-Object System.Windows.Forms.Label
$messageLabel.Text = '提醒内容'
$messageLabel.AutoSize = $true
$messageLabel.Location = New-Object System.Drawing.Point(18, 142)
$editorPanel.Controls.Add($messageLabel)

$messageBox = New-Object System.Windows.Forms.TextBox
$messageBox.Location = New-Object System.Drawing.Point(18, 165)
$messageBox.Size = New-Object System.Drawing.Size(382, 25)
$messageBox.Text = '提醒今天喝水进度'
$editorPanel.Controls.Add($messageBox)

$addButton = New-Object System.Windows.Forms.Button
$addButton.Text = '保存提醒'
$addButton.FlatStyle = 'Flat'
$addButton.BackColor = [System.Drawing.Color]::FromArgb(32, 126, 96)
$addButton.ForeColor = [System.Drawing.Color]::White
$addButton.Size = New-Object System.Drawing.Size(118, 36)
$addButton.Location = New-Object System.Drawing.Point(416, 158)
$editorPanel.Controls.Add($addButton)

$listLabel = New-Object System.Windows.Forms.Label
$listLabel.Text = '已设置的提醒'
$listLabel.Font = New-UiFont 11 ([System.Drawing.FontStyle]::Bold)
$listLabel.AutoSize = $true
$listLabel.Location = New-Object System.Drawing.Point(20, 374)
$mainForm.Controls.Add($listLabel)

$reminderList = New-Object System.Windows.Forms.ListBox
$reminderList.Location = New-Object System.Drawing.Point(20, 404)
$reminderList.Size = New-Object System.Drawing.Size(554, 95)
$reminderList.Font = New-UiFont 10
$mainForm.Controls.Add($reminderList)
$script:listIds = @()

$deleteButton = New-Object System.Windows.Forms.Button
$deleteButton.Text = '删除选中'
$deleteButton.Size = New-Object System.Drawing.Size(92, 30)
$deleteButton.Location = New-Object System.Drawing.Point(20, 510)
$mainForm.Controls.Add($deleteButton)

$autoStartCheck = New-Object System.Windows.Forms.CheckBox
$autoStartCheck.Text = '开机自动启动'
$autoStartCheck.AutoSize = $true
$autoStartCheck.Location = New-Object System.Drawing.Point(132, 516)
$autoStartCheck.Checked = Test-AutoStart
$mainForm.Controls.Add($autoStartCheck)

$trayHint = New-Object System.Windows.Forms.Label
$trayHint.Text = '关闭窗口后仍在托盘运行'
$trayHint.AutoSize = $true
$trayHint.ForeColor = [System.Drawing.Color]::FromArgb(96, 104, 112)
$trayHint.Location = New-Object System.Drawing.Point(392, 518)
$mainForm.Controls.Add($trayHint)

function Update-ModeUi {
    $isOnce = $script:mode -eq 'Once'
    $oncePicker.Visible = $isOnce
    $repeatPicker.Visible = -not $isOnce
    $dayLabel.Visible = -not $isOnce
    foreach ($button in $script:dayButtons) { $button.Visible = -not $isOnce }

    $onceModeButton.BackColor = $(if ($isOnce) { [System.Drawing.Color]::White } else { [System.Drawing.Color]::FromArgb(232, 237, 243) })
    $repeatModeButton.BackColor = $(if ($isOnce) { [System.Drawing.Color]::FromArgb(232, 237, 243) } else { [System.Drawing.Color]::White })
    $onceModeButton.ForeColor = $(if ($isOnce) { [System.Drawing.Color]::FromArgb(45, 92, 138) } else { [System.Drawing.Color]::FromArgb(80, 88, 96) })
    $repeatModeButton.ForeColor = $(if ($isOnce) { [System.Drawing.Color]::FromArgb(80, 88, 96) } else { [System.Drawing.Color]::FromArgb(45, 92, 138) })
}

$onceModeButton.Add_Click({ $script:mode = 'Once'; Update-ModeUi })
$repeatModeButton.Add_Click({ $script:mode = 'Repeat'; Update-ModeUi })
Update-ModeUi

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Information
$notifyIcon.Text = $appName
$notifyIcon.Visible = $true

$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
$showMenuItem = $trayMenu.Items.Add('打开桌面提醒')
$exitMenuItem = $trayMenu.Items.Add('退出')
$notifyIcon.ContextMenuStrip = $trayMenu

function Refresh-ReminderList {
    $reminderList.Items.Clear()
    $script:listIds = @()
    $now = Get-Date
    foreach ($reminder in @($script:reminders | Sort-Object { [datetime]$_.When })) {
        $when = [datetime]$reminder.When
        $repeatDays = @(Get-RepeatDays $reminder)
        $displayTime = if ($repeatDays.Count -gt 0) {
            $names = @{ 0 = '日'; 1 = '一'; 2 = '二'; 3 = '三'; 4 = '四'; 5 = '五'; 6 = '六' }
            $ordered = @(1, 2, 3, 4, 5, 6, 0) | Where-Object { $repeatDays -contains $_ }
            $dayText = ($ordered | ForEach-Object { '周' + $names[$_] }) -join ' '
            '{0}  {1}' -f $when.ToString('HH:mm'), $dayText
        }
        else {
            $when.ToString('MM-dd  HH:mm')
        }
        $suffix = if (-not [bool]$reminder.Enabled) { '（已完成）' } elseif ($repeatDays.Count -eq 0 -and $when -lt $now) { '（已过期）' } else { '' }
        [void]$reminderList.Items.Add("$displayTime    $([string]$reminder.Message)$suffix")
        $script:listIds += [string]$reminder.Id
    }
}

function Show-ReminderPopup {
    param(
        [string]$Message,
        [datetime]$ScheduledTime,
        [scriptblock]$OnSnooze
    )

    if ($script:popupOpen) { return }
    $script:popupOpen = $true

    $popup = New-Object System.Windows.Forms.Form
    $popup.Text = '时间到了'
    $popup.StartPosition = 'CenterScreen'
    $popup.Size = New-Object System.Drawing.Size(460, 260)
    $popup.FormBorderStyle = 'FixedDialog'
    $popup.MaximizeBox = $false
    $popup.MinimizeBox = $false
    $popup.TopMost = $true
    $popup.BackColor = [System.Drawing.Color]::White
    $popup.Font = New-UiFont 10
    $popup.Icon = [System.Drawing.SystemIcons]::Information

    $timeText = New-Object System.Windows.Forms.Label
    $timeText.Text = $ScheduledTime.ToString('HH:mm')
    $timeText.Font = New-UiFont 30 ([System.Drawing.FontStyle]::Bold)
    $timeText.ForeColor = [System.Drawing.Color]::FromArgb(45, 92, 138)
    $timeText.AutoSize = $true
    $timeText.Location = New-Object System.Drawing.Point(26, 22)
    $popup.Controls.Add($timeText)

    $messageText = New-Object System.Windows.Forms.Label
    $messageText.Text = $Message
    $messageText.Font = New-UiFont 13
    $messageText.ForeColor = [System.Drawing.Color]::FromArgb(42, 47, 52)
    $messageText.Location = New-Object System.Drawing.Point(30, 92)
    $messageText.Size = New-Object System.Drawing.Size(390, 58)
    $popup.Controls.Add($messageText)

    $snoozeButton = New-Object System.Windows.Forms.Button
    $snoozeButton.Text = '10分钟后提醒'
    $snoozeButton.Size = New-Object System.Drawing.Size(132, 36)
    $snoozeButton.Location = New-Object System.Drawing.Point(135, 172)
    $popup.Controls.Add($snoozeButton)

    $dismissButton = New-Object System.Windows.Forms.Button
    $dismissButton.Text = '知道了'
    $dismissButton.Size = New-Object System.Drawing.Size(118, 36)
    $dismissButton.Location = New-Object System.Drawing.Point(282, 172)
    $dismissButton.BackColor = [System.Drawing.Color]::FromArgb(32, 126, 96)
    $dismissButton.ForeColor = [System.Drawing.Color]::White
    $dismissButton.FlatStyle = 'Flat'
    $popup.Controls.Add($dismissButton)

    $snoozeButton.Add_Click({
        if ($OnSnooze) { & $OnSnooze }
        $popup.Close()
    })
    $dismissButton.Add_Click({ $popup.Close() })
    $popup.Add_FormClosed({ $script:popupOpen = $false })

    $notifyIcon.ShowBalloonTip(4000, '时间到了', $Message, [System.Windows.Forms.ToolTipIcon]::Info)
    [void]$popup.ShowDialog()
}

function Check-DueReminders {
    if ($script:popupOpen) { return }

    $now = Get-Date
    foreach ($reminder in @($script:reminders)) {
        if (-not [bool]$reminder.Enabled) { continue }

        $baseTime = [datetime]$reminder.When
        $isDue = $false
        $scheduled = $baseTime

        $repeatDays = @(Get-RepeatDays $reminder)
        if ($repeatDays.Count -gt 0) {
            $scheduled = Get-Date -Year $now.Year -Month $now.Month -Day $now.Day -Hour $baseTime.Hour -Minute $baseTime.Minute -Second 0
            $lastDate = [string]$reminder.LastTriggeredDate
            $isDue = ($repeatDays -contains [int]$now.DayOfWeek) -and ($now -ge $scheduled) -and ($now -lt $scheduled.AddHours(6)) -and ($lastDate -ne $now.ToString('yyyy-MM-dd'))
        }
        else {
            $isDue = ($now -ge $scheduled) -and ($now -lt $scheduled.AddHours(24))
        }

        if (-not $isDue) { continue }

        if ($repeatDays.Count -gt 0) {
            $reminder.LastTriggeredDate = $now.ToString('yyyy-MM-dd')
        }
        else {
            $reminder.Enabled = $false
        }
        Save-Reminders $script:reminders
        Refresh-ReminderList

        $id = [string]$reminder.Id
        $text = [string]$reminder.Message
        Show-ReminderPopup -Message $text -ScheduledTime $scheduled -OnSnooze {
            $snooze = New-ReminderObject -When (Get-Date).AddMinutes(10) -Message $text
            [void]$script:reminders.Add($snooze)
            Save-Reminders $script:reminders
            Refresh-ReminderList
        }
        break
    }
}

$addButton.Add_Click({
    $message = $messageBox.Text.Trim()
    if ([string]::IsNullOrWhiteSpace($message)) {
        [System.Windows.Forms.MessageBox]::Show('请填写提醒内容。', $appName, 'OK', 'Warning') | Out-Null
        return
    }

    if ($script:mode -eq 'Once') {
        $when = $oncePicker.Value
        if ($when -le (Get-Date)) {
            [System.Windows.Forms.MessageBox]::Show('一次提醒的时间必须晚于现在。', $appName, 'OK', 'Warning') | Out-Null
            return
        }
        $newReminder = New-ReminderObject -When $when -Message $message
    }
    else {
        if ($script:selectedDays.Count -eq 0) {
            [System.Windows.Forms.MessageBox]::Show('请至少选择一个重复日期。', $appName, 'OK', 'Warning') | Out-Null
            return
        }
        $when = $repeatPicker.Value
        $newReminder = New-ReminderObject -When $when -Message $message -RepeatDays @($script:selectedDays)
    }
    [void]$script:reminders.Add($newReminder)
    Save-Reminders $script:reminders
    Refresh-ReminderList
    $messageBox.SelectAll()
})

$deleteButton.Add_Click({
    if ($reminderList.SelectedIndex -lt 0) { return }
    $id = $script:listIds[$reminderList.SelectedIndex]
    for ($i = $script:reminders.Count - 1; $i -ge 0; $i--) {
        if ([string]$script:reminders[$i].Id -eq $id) {
            $script:reminders.RemoveAt($i)
        }
    }
    Save-Reminders $script:reminders
    Refresh-ReminderList
})

$autoStartCheck.Add_CheckedChanged({
    try {
        Set-AutoStart -Enabled $autoStartCheck.Checked
    }
    catch {
        [System.Windows.Forms.MessageBox]::Show("开机启动设置失败：$($_.Exception.Message)", $appName, 'OK', 'Error') | Out-Null
        $autoStartCheck.Checked = Test-AutoStart
    }
})

$showMenuItem.Add_Click({
    $mainForm.Show()
    $mainForm.WindowState = 'Normal'
    $mainForm.Activate()
})
$notifyIcon.Add_DoubleClick({
    $mainForm.Show()
    $mainForm.WindowState = 'Normal'
    $mainForm.Activate()
})
$exitMenuItem.Add_Click({
    $script:allowExit = $true
    $notifyIcon.Visible = $false
    $mainForm.Close()
})

$mainForm.Add_FormClosing({
    param($sender, $eventArgs)
    if (-not $script:allowExit) {
        $eventArgs.Cancel = $true
        $mainForm.Hide()
        $notifyIcon.ShowBalloonTip(2500, $appName, '程序仍在后台运行，到点会弹出提醒。', [System.Windows.Forms.ToolTipIcon]::Info)
    }
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 15000
$timer.Add_Tick({ Check-DueReminders })
$timer.Start()

Refresh-ReminderList
$mainForm.Add_Shown({ Check-DueReminders })

try {
    [void][System.Windows.Forms.Application]::Run($mainForm)
}
finally {
    $timer.Stop()
    $notifyIcon.Dispose()
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}

